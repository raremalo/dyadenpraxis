import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders } from './_lib/cors';
import { verifyJWT } from './_lib/auth';

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

  const userId = user.sub;

  try {
    // Re-Auth: Passwort-Bestaetigung erforderlich
    const { password } = req.body;
    if (!password || typeof password !== 'string' || password.length < 1) {
      return res.status(400).json({ error: 'Passwort-Bestaetigung erforderlich' });
    }

    // Passwort ueber Supabasae Auth verifizieren (normaler Client, nicht Admin)
    const supabaseAuth = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    const userEmail = userData.user?.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'Benutzer-E-Mail nicht gefunden' });
    }

    const { error: pwError } = await supabaseAuth.auth.signInWithPassword({
      email: userEmail,
      password,
    });
    if (pwError) {
      return res.status(401).json({ error: 'Passwort inkorrekt' });
    }
    // 1. Avatar aus Storage loeschen (best effort)
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (profile?.avatar_url) {
        const url = new URL(profile.avatar_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/avatars\/([^?#]+)/);
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
      console.error('[DeleteAccount] Account-Loeschung fehlgeschlagen:', deleteError);
      return res.status(500).json({ error: 'Account-Loeschung fehlgeschlagen' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[DeleteAccount] Account-Loeschung fehlgeschlagen:', error);
    return res.status(500).json({ error: 'Account-Loeschung fehlgeschlagen' });
  }
}
