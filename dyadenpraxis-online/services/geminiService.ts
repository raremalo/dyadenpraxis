import { GoogleGenAI, Type } from "@google/genai";
import { PromptResponse } from "../types";
import { DYAD_CATEGORIES, getRandomQuestion, getCategoryByKey } from '../data/dyadQuestions';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const fetchDyadPrompt = async (categoryKey?: string): Promise<PromptResponse> => {
  try {
    const model = 'gemini-2.0-flash';

    // Determine category: use provided key or pick a random one
    let category = categoryKey ? getCategoryByKey(categoryKey) : undefined;
    if (!category) {
      category = DYAD_CATEGORIES[Math.floor(Math.random() * DYAD_CATEGORIES.length)];
    }

    // Pick up to 3 example questions from the category
    const examples = category.questions.slice(0, 3);
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

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "Die neue Dyaden-Frage" },
            context: { type: Type.STRING, description: "Eine sanfte, kurze Anweisung zur Kontemplation" },
            category: { type: Type.STRING, description: "Die Kategorie der Frage" }
          },
          required: ["question"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Keine Antwort von Gemini erhalten");

    const parsed = JSON.parse(text) as PromptResponse;

    // Ensure category is set if Gemini didn't return it
    if (!parsed.category) {
      parsed.category = category.name;
    }

    return parsed;

  } catch (error) {
    console.error("Error fetching prompt:", error);
    const fallback = getRandomQuestion(categoryKey);
    return {
      question: fallback.text,
      context: "Atme tief ein und spüre in dich hinein. Was ist jetzt gerade wahr?",
      category: fallback.category
    };
  }
};
