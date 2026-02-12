import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jwtVerify, createRemoteJWKSet } from 'jose';

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

// JWT Verifizierung (lokal mit jose)
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
  return res.json();
}

// Handler
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
    const { sessionId, includeThird } = req.body;
    const roomName = `em-${sessionId}-${Date.now()}`;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1h

    const room = await createDailyRoom(roomName, expiresAt);
    const requesterToken = await createMeetingToken(roomName, 'requester', expiresAt);
    const partnerToken = await createMeetingToken(roomName, 'partner', expiresAt);

    // Optional: 3. Teilnehmer Token fuer Level 3
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
    console.error('Daily.co API error:', error);
    return res.status(500).json({ error: 'Room creation failed' });
  }
}
