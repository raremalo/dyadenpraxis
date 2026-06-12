import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { setCorsHeaders } from './_lib/cors.js';
import { verifyJWT } from './_lib/auth.js';

// Supabase Admin Client fuer Session-Ownership-Pruefung
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Daily.co Room Creation
const DAILY_API = 'https://api.daily.co/v1';

async function createDailyRoom(name: string, expiresAt: number) {
  const res = await fetch(`${DAILY_API}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name,
      properties: {
        exp: expiresAt,
        max_participants: 3,
        enable_chat: false,
        enable_knocking: false,
      },
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Daily.co rooms API Fehler ${res.status}: ${errorText}`);
  }
  return res.json();
}

async function createMeetingToken(roomName: string, userId: string, expiresAt: number) {
  const res = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        exp: expiresAt,
        is_owner: false,
      },
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Daily.co meeting-tokens API Fehler ${res.status}: ${errorText}`);
  }
  return res.json();
}

// Handler
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
    const { sessionId, includeThird } = req.body;

    // Session-Id Validierung
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
      return res.status(400).json({ error: 'Ungueltige sessionId' });
    }

    // Session-Ownership-Pruefung: User muss Teilnehmer sein
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('requester_id, partner_id, third_participant_id, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session nicht gefunden' });
    }

    const participants = [session.requester_id, session.partner_id];
    if (session.third_participant_id) participants.push(session.third_participant_id);
    if (!participants.includes(user.sub)) {
      return res.status(403).json({ error: 'Nicht berechtigt' });
    }

    const roomName = `em-${sessionId}-${Date.now()}`;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1h

    const room = await createDailyRoom(roomName, expiresAt);
    const requesterToken = await createMeetingToken(roomName, 'requester', expiresAt);
    const partnerToken = await createMeetingToken(roomName, 'partner', expiresAt);

    // Optional: 3. Teilnehmer Token
    let thirdToken = null;
    if (includeThird) {
      thirdToken = await createMeetingToken(roomName, 'third', expiresAt);
    }

    return res.status(200).json({
      roomUrl: room.url,
      tokens: {
        requester: requesterToken.token,
        partner: partnerToken.token,
        third: thirdToken?.token ?? null,
      },
    });
  } catch (error) {
    console.error('[CreateRoom] Daily.co API Fehler:', error);
    return res.status(500).json({ error: 'Room-Erstellung fehlgeschlagen' });
  }
}
