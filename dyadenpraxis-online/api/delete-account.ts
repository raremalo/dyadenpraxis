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

/**
 * GDPR Account Deletion Endpoint
 * 
 * Loescht den authentifizierten User vollstaendig:
 * 1. Avatar aus Supabase Storage entfernen
 * 2. auth.users Eintrag loeschen (kaskadiert zu profiles -> alle Tabellen)
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

  const userId = user.sub;

  try {
    // 1. Avatar aus Storage loeschen (best effort)
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (profile?.avatar_url) {
        const url = new URL(profile.avatar_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/avatars\/(.+)/);
        if (pathMatch) {
          await supabaseAdmin.storage.from('avatars').remove([pathMatch[1]]);
        }
      }
    } catch {
      // Avatar-Cleanup ist nicht kritisch
    }

    // 2. Push-Subscription entfernen (best effort)
    try {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);
    } catch {
      // Nicht kritisch
    }

    // 3. Auth User loeschen - kaskadiert zu profiles -> alle abhaengigen Tabellen
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Account-Loeschung fehlgeschlagen:', deleteError);
      return res.status(500).json({ error: 'Account deletion failed' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Account deletion failed' });
  }
}
