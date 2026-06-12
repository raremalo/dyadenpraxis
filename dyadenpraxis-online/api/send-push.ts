import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders } from './_lib/cors.js';
import { verifyJWT } from './_lib/auth.js';

// Supabase Admin Client (Service Role)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// VAPID Keys
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@dyadenpraxis.de';

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
 * RFC 8291 Payload-Verschluesselung fuer Web Push
 * Verwendet Web Crypto API mit expliziten Typ-Casts
 */
function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function concat(...bufs: (Uint8Array | ArrayBuffer)[]): Uint8Array {
  const arrays = bufs.map(b => b instanceof ArrayBuffer ? new Uint8Array(b) : b);
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { result.set(a, off); off += a.length; }
  return result;
}

async function hmacSHA256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const hmacKey = await crypto.subtle.importKey(
    'raw', key.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', hmacKey, data.buffer as ArrayBuffer);
  return new Uint8Array(sig);
}

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<Uint8Array> {
  const authBytes = base64ToBytes(auth);
  const recipientPubKey = await crypto.subtle.importKey(
    'raw', base64ToBytes(p256dh).buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  // Temporaeren ECDH-Schluessel generieren
  const tempPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const tempPubRaw = await crypto.subtle.exportKey('raw', tempPair.publicKey);
  const tempPubBytes = new Uint8Array(tempPubRaw);

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: recipientPubKey }, tempPair.privateKey, 256
    )
  );

  // IKM = auth || sharedSecret
  const ikm = concat(authBytes, sharedSecret);

  // Salt (16 bytes random)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK = HMAC-SHA-256(salt, IKM)
  const prk = await hmacSHA256(salt, ikm);

  // CEK = HMAC-SHA-256(PRK, "Content-Encoding: aes128gcm" + 0x00)[0..15]
  const cekCtx = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cekFull = await hmacSHA256(prk, cekCtx);
  const cek = cekFull.slice(0, 16);

  // Nonce = HMAC-SHA-256(PRK, "Content-Encoding: nonce" + 0x00)[0..11]
  const nonceCtx = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonceFull = await hmacSHA256(prk, nonceCtx);
  const nonce = nonceFull.slice(0, 12);

  // Payload mit Padding
  const payloadBytes = new TextEncoder().encode(payload);
  const padded = new Uint8Array(payloadBytes.length + 1);
  padded.set(payloadBytes);
  padded[payloadBytes.length] = 2; // Padding-Delimiter

  // AES-128-GCM verschluesseln
  const aesKey = await crypto.subtle.importKey(
    'raw', cek.buffer as ArrayBuffer, { name: 'AES-GCM' }, false, ['encrypt']
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer, tagLength: 128 },
      aesKey, padded.buffer as ArrayBuffer
    )
  );

  // RFC 8291 Body: salt(16) + rs(4) + tempPubKey(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  return concat(salt, rs, tempPubBytes, encrypted);
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
    
    // Payload gemaess RFC 8291 verschluesseln
    const encryptedBody = await encryptPayload(
      JSON.stringify(payload),
      subscription.p256dh,
      subscription.auth
    );
    
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
      body: encryptedBody.buffer as ArrayBuffer,
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
    console.error('[SendPush] Push-Versand fehlgeschlagen:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * API Handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string;
  setCorsHeaders(origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode nicht erlaubt' });

  // JWT Auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autorisierung fehlt' });
  }

  const user = await verifyJWT(authHeader.slice(7));
  if (!user) return res.status(401).json({ error: 'Ungültiges Token' });

  try {
    const { recipientIds, payload } = req.body as {
      recipientIds: string[];
      payload: PushPayload;
    };

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ error: 'recipientIds erforderlich' });
    }

    if (recipientIds.length > 100) {
      return res.status(400).json({ error: 'Maximal 100 Empfaenger pro Aufruf' });
    }

    if (!payload || !payload.title || !payload.body) {
      return res.status(400).json({ error: 'payload mit title und body erforderlich' });
    }

    // Subscriptions für alle Empfänger laden
    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', recipientIds);

    if (dbError) {
      console.error('[SendPush] DB-Fehler:', dbError);
      return res.status(500).json({ error: 'Abonnements konnten nicht geladen werden' });
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

        // Bei 410 Gone: Nur diese spezifische Subscription loeschen
        if (result.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
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
    });
  } catch (error) {
    console.error('[SendPush] Push-Benachrichtigung fehlgeschlagen:', error);
    return res.status(500).json({ error: 'Push-Benachrichtigung fehlgeschlagen' });
  }
}
