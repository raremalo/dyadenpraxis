import type { VercelRequest, VercelResponse } from '@vercel/node';

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

// Valid category keys (allowlist)
const VALID_CATEGORY_KEYS = new Set([
  'existenziell', 'praesenz', 'mitgefuehl', 'emotionen',
  'selbsterforschung', 'stress', 'perspektiven', 'beduerfnisse',
  'beziehungen', 'moeglichkeiten',
]);

// Inline category data for server-side prompt building
const CATEGORIES: Record<string, { name: string; questions: string[] }> = {
  existenziell: {
    name: 'Existenziell',
    questions: ['Wer bin ich?', 'Was bin ich?', 'Was ist Leben?', 'Was ist ein Anderer?', 'Was ist Liebe?'],
  },
  praesenz: {
    name: 'Präsenz & Achtsamkeit',
    questions: ['Dich öffnen und beobachten, was nimmst du wahr?', 'Präsent sein mit allem was ist, was erlebst du jetzt?', 'Was ist in dir gerade lebendig?', 'Was nimmst du in diesem Moment in deinem Körper wahr?'],
  },
  mitgefuehl: {
    name: 'Mitgefühl & Verbindung',
    questions: ['Das Leben in dir umarmen, was nimmst du wahr?', 'Was bedeutet Mitgefühl für dich in diesem Moment?', 'Wofür bist du heute dankbar?'],
  },
  emotionen: {
    name: 'Emotionen & Gefühle',
    questions: ['Welche Emotion nimmst du gerade in dir wahr?', 'Was brauchst du gerade emotional?', 'Welches Gefühl möchte gerade gesehen werden?'],
  },
  selbsterforschung: {
    name: 'Selbsterforschung',
    questions: ['Was ist deine tiefste Wahrheit in diesem Moment?', 'Welche Überzeugung hält dich gerade fest?', 'Welcher Teil von dir möchte gehört werden?'],
  },
  stress: {
    name: 'Stress & Herausforderungen',
    questions: ['Wie reagiert dein Körper auf Stress?', 'Was brauchst du, um mit Stress besser umzugehen?', 'Was ist deine größte Herausforderung gerade?'],
  },
  perspektiven: {
    name: 'Perspektiven & Wachstum',
    questions: ['Welche neue Perspektive möchte sich zeigen?', 'Welcher nächste Schritt möchte gegangen werden?', 'Welche Unterstützung brauchst du für dein Wachstum?'],
  },
  beduerfnisse: {
    name: 'Bedürfnisse & Wünsche',
    questions: ['Was brauchst du wirklich in deinem Leben?', 'Was ist deine tiefste Sehnsucht?', 'Wonach sehnt sich das Leben in dir in diesem Moment?'],
  },
  beziehungen: {
    name: 'Beziehungen & Gemeinschaft',
    questions: ['Wie erlebst du Verbindung zu anderen?', 'Was bedeutet Gemeinschaft für dich?', 'Was hindert dich daran, dich wirklich zu zeigen?'],
  },
  moeglichkeiten: {
    name: 'Möglichkeiten & Zukunft',
    questions: ['Welche Vision möchte sich durch dich verwirklichen?', 'Was möchte in der Welt durch dich entstehen?', 'Wie sähe dein ideales Leben aus?'],
  },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

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
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    let { categoryKey } = req.body || {};

    // Validate categoryKey against allowlist
    if (categoryKey && !VALID_CATEGORY_KEYS.has(categoryKey)) {
      categoryKey = undefined;
    }

    // Pick category
    const key = categoryKey || CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
    const category = CATEGORIES[key];

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

    // Call Gemini API via REST
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              question: { type: 'STRING', description: 'Die neue Dyaden-Frage' },
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
    const result = {
      question: (parsed.question || '').slice(0, 300),
      context: (parsed.context || '').slice(0, 500),
      category: parsed.category || category.name,
    };

    return res.status(200).json(result);

  } catch (error) {
    // Fallback: return a random curated question
    const key = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
    const cat = CATEGORIES[key];
    const q = cat.questions[Math.floor(Math.random() * cat.questions.length)];

    return res.status(200).json({
      question: q,
      context: 'Atme tief ein und spüre in dich hinein. Was ist jetzt gerade wahr?',
      category: cat.name,
    });
  }
}
