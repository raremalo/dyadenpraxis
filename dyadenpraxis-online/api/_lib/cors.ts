const ALLOWED_ORIGINS: (string | RegExp)[] = [
  'https://dyadenpraxis.de',
  'https://www.dyadenpraxis.de',
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(o => 
    typeof o === 'string' ? o === origin : o.test(origin)
  );
}

export function setCorsHeaders(origin: string | undefined, res: { setHeader: (k: string, v: string) => void }) {
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}
