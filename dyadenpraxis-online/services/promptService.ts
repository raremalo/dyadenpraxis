/**
 * Prompt-Fetching für Dyaden-Fragen: ruft /api/generate-prompt auf und fällt
 * bei Fehler/Timeout auf den lokalen Fragen-Katalog zurück (data/dyadQuestions).
 * Kein Gemini-Direktaufruf — die API-Route hält den Provider (L1-03).
 */
import { DyadPrompt } from "../types";
import { getRandomQuestion, DYAD_CATEGORIES } from '../data/dyadQuestions';
import { supabase } from '../lib/supabase';

// Valid category keys for client-side validation
const VALID_KEYS = new Set(DYAD_CATEGORIES.map(c => c.key));

export const fetchDyadPrompt = async (categoryKey?: string): Promise<DyadPrompt> => {
  // Validate categoryKey against allowlist
  if (categoryKey && !VALID_KEYS.has(categoryKey)) {
    categoryKey = undefined;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    // Abort-Deckung auch für die Auth-Phase: supabase-js nimmt kein Signal an —
    // daher post-await Check; der fetch selbst ist nativ signal-gedeckt (L1-04).
    if (controller.signal.aborted) {
      throw new Error('Prompt-Anfrage abgebrochen (Timeout)');
    }
    if (!session?.access_token) {
      throw new Error('Nicht angemeldet');
    }

    const response = await fetch('/api/generate-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ categoryKey }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as DyadPrompt;
    return data;

  } catch (error) {
    console.error('[PromptService] Prompt abrufen fehlgeschlagen:', error instanceof Error ? error.message : "Unknown error");
    // Fallback to local pool
    const fallback = getRandomQuestion(categoryKey);
    return {
      question: fallback.text,
      context: "Atme tief ein und spüre in dich hinein. Was ist jetzt gerade wahr?",
      category: fallback.category,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};
