/**
 * Authentifizierter Fetch-Helfer für Vercel-API-Routen (L3.5-02):
 * holt das Supabase-Session-Token, setzt Authorization- und Content-Type-Header
 * und wirft bei !ok mit der Server-Fehlermeldung aus dem Body.
 */
import { supabase } from './supabase';

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  // Abort-Deckung auch für die Auth-Phase: supabase-js nimmt kein Signal an —
  // daher post-await Check; der fetch selbst ist nativ signal-gedeckt (L1-04).
  if (init.signal?.aborted) {
    throw new Error('Anfrage abgebrochen (Timeout)');
  }
  if (!session?.access_token) {
    throw new Error('Nicht angemeldet');
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });

  if (!response.ok) {
    let message = `API-Fehler ${response.status}`;
    try {
      const body = await response.json() as { error?: string };
      if (body?.error) message = body.error;
    } catch { /* Body nicht JSON-parsbar — Status-Fallback bleibt */ }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
