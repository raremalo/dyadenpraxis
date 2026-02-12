import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { createClient } from '@supabase/supabase-js';

// CORS Konfiguration
const ALLOWED_ORIGINS = [
  'https://dyadenpraxis.de',
  'https://www.dyadenpraxis.de',
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(o => 
    typeof o === 'string' ? o === origin : o.test(origin)
  );
}

// JWT Verifizierung
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.VITE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

async function verifyJWT(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${process.env.VITE_SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    return payload as { sub: string };
  } catch {
    return null;
  }
}

// Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// VAPID Keys
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@ehrlichesmitteilen.org';

// Notification Types
type NotificationType = 'message' | 'session_request' | 'scheduled_session' | 'verification' | 'generic';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    type: NotificationType;
    url?: string;
    senderId?: string;
    sessionId?: string;
    scheduledSessionId?: string;
    [key: string]: unknown;
  };
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Erstellt JWT für Web Push Authentication
 */
async function createVapidJwt(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // VAPID JWT erstellen mit jose
  const { SignJWT } = await import('jose');
  const privateKeyJwk = JSON.parse(
    Buffer.from(VAPID_PRIVATE_KEY, 'base64').toString('utf-8')
  );
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setSubject(VAPID_SUBJECT)
    .setAudience(audience)
    .setExpirationTime('24h')
    .sign(privateKey);
  
  return jwt;
}

/**
 * Sendet Push Notification an einen Endpunkt
 */
async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    const vapidJwt = await createVapidJwt(subscription.endpoint);
    
    // Payload als JSON String
    const body = JSON.stringify(payload);
    const encodedBody = new TextEncoder().encode(body);
    
    // Web Push HTTP Request
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400', // 24 Stunden
        'Authorization': `vapid t=${vapidJwt}, k=${VAPID_PUBLIC_KEY}`,
        'Urgency': 'normal',
      },
      body: encodedBody,
    });

    if (response.status === 201) {
      return { success: true };
    } else if (response.status === 410) {
      // Gone - Subscription ist nicht mehr gültig
      return { success: false, error: 'subscription_expired', statusCode: 410 };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText, statusCode: response.status };
    }
  } catch (error) {
    console.error('Push send error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * API Handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string;
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // JWT Auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization' });
  }

  const user = await verifyJWT(authHeader.slice(7));
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  try {
    const { recipientIds, payload } = req.body as {
      recipientIds: string[];
      payload: PushPayload;
    };

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ error: 'recipientIds required' });
    }

    if (!payload || !payload.title || !payload.body) {
      return res.status(400).json({ error: 'payload with title and body required' });
    }

    // Subscriptions für alle Empfänger laden
    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', recipientIds);

    if (dbError) {
      console.error('DB error:', dbError);
      return res.status(500).json({ error: 'Failed to load subscriptions' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ 
        sent: 0, 
        failed: 0, 
        noSubscription: recipientIds.length,
        message: 'No push subscriptions found for recipients' 
      });
    }

    // Push an alle Subscriptions senden
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        );

        // Bei 410 Gone: Subscription aus DB löschen
        if (result.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('user_id', sub.user_id);
        }

        return { userId: sub.user_id, ...result };
      })
    );

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const expired = results.filter(r => r.statusCode === 410).length;

    return res.status(200).json({
      sent,
      failed,
      expired,
      noSubscription: recipientIds.length - subscriptions.length,
      details: results,
    });
  } catch (error) {
    console.error('Send push error:', error);
    return res.status(500).json({ error: 'Push notification failed' });
  }
}
