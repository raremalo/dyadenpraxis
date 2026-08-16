import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_lib/cors.js';
import { verifyJWT } from './_lib/auth.js';
import { DYAD_CATEGORIES, type DyadCategory } from '../shared/categories.js';
import type { DyadPrompt } from '../types.js';

// Kanonischer Katalog aus shared/categories.ts (L5-01 — vorher gedriftete Inline-Kopie)
const VALID_CATEGORY_KEYS = new Set(DYAD_CATEGORIES.map(c => c.key));
const CATEGORY_KEYS = DYAD_CATEGORIES.map(c => c.key);
const CATEGORY_BY_KEY = new Map(DYAD_CATEGORIES.map(c => [c.key, c]));

function getCategory(key: string): DyadCategory {
  const cat = CATEGORY_BY_KEY.get(key);
  if (!cat) throw new Error(`Unknown category: ${key}`);
  return cat;
}

function pickRandomKey(): string {
  return CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
}

/** Kuratierte Fallback-Antwort (L5-03: respektiert die gewählte Kategorie). */
const fallbackPrompt = (cat: DyadCategory): DyadPrompt => ({
  question: cat.questions[Math.floor(Math.random() * cat.questions.length)],
  context: 'Atme tief ein und spüre in dich hinein. Was ist jetzt gerade wahr?',
  category: cat.name,
});

// Rate limiting: simple in-memory per-IP (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // max requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const origin = req.headers.origin as string;
  setCorsHeaders(origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // JWT Auth (wie create-room.ts, delete-account.ts)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autorisierung fehlt' });
  }
  const user = await verifyJWT(authHeader.slice(7));
  if (!user) return res.status(401).json({ error: 'Ungültiges Token' });

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  // categoryKey EINMAL außerhalb des try sanitizen — die Fallback-Pfade
  // (No-API-Key, catch) brauchen ihn ebenfalls (L5-03).
  const { categoryKey: rawCategoryKey } = req.body || {};
  const sanitizedCategoryKey =
    rawCategoryKey && VALID_CATEGORY_KEYS.has(rawCategoryKey) ? rawCategoryKey : undefined;

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Pick category
    const key = sanitizedCategoryKey || pickRandomKey();
    const category = getCategory(key);

    // Shuffle and pick 3 examples
    const shuffled = [...category.questions].sort(() => Math.random() - 0.5);
    const examples = shuffled.slice(0, 3);
    const exampleLines = examples.map(q => `- "${q}"`).join('\n');

    const prompt = `Du bist ein Experte für Dyadenpraxis — eine kontemplative Kommunikationsform, entwickelt von Charles Berner (Enlightenment Intensive) und wissenschaftlich fundiert durch Prof. Dr. Tania Singers ReConnect! Programm.

Erstelle eine neue, tiefgründige Dyadenfrage für die Kategorie "${category.name}".

Beispiele aus dieser Kategorie:
${exampleLines}

Die Frage soll:
- Kurz und offen formuliert sein
- Zur Selbsterforschung einladen
- Im Stil der Beispiele bleiben, aber eine NEUE Frage sein
- Nicht identisch mit den Beispielen sein

Gib auch einen kurzen Kontext oder eine Kontemplationsanweisung dazu.

Die Kategorie der Antwort soll "${category.name}" sein.`;

    // Skip Gemini if no API key configured (graceful fallback to curated questions)
    if (!GEMINI_API_KEY) {
      return res.status(200).json(fallbackPrompt(category));
    }

    // Call Gemini API via REST — API key in header (not URL) to prevent log leakage
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`;

    const geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              question: { type: 'STRING', description: 'Die neue Dyadenfrage' },
              context: { type: 'STRING', description: 'Eine sanfte, kurze Anweisung zur Kontemplation' },
              category: { type: 'STRING', description: 'Die Kategorie der Frage' },
            },
            required: ['question'],
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('No response from Gemini');

    const parsed = JSON.parse(text);

    // Truncate and sanitize response
    const result: DyadPrompt = {
      question: (parsed.question || '').slice(0, 300),
      context: (parsed.context || '').slice(0, 500),
      category: parsed.category || category.name,
    };

    return res.status(200).json(result);

  } catch (error) {
    // Fallback: kuratierte Frage — L5-03: respektiert sanitizedCategoryKey
    return res.status(200).json(fallbackPrompt(getCategory(sanitizedCategoryKey || pickRandomKey())));
  }
}
