import { GoogleGenAI, Type } from "@google/genai";
import { PromptResponse } from "../types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const fetchDyadPrompt = async (): Promise<PromptResponse> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    // We want a JSON response
    const response = await ai.models.generateContent({
      model,
      contents: "Erstelle eine tiefgründige, meditative Frage für eine Dyaden-Praxis (Enlightenment Intensive style). Die Frage sollte kurz und offen sein, um Selbsterforschung zu ermöglichen. Gib auch einen kurzen Kontext oder eine Anweisung dazu.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "Die Dyaden-Frage, z.B. 'Sag mir, wer du bist'" },
            context: { type: Type.STRING, description: "Eine sanfte, kurze Anweisung zur Kontemplation" }
          },
          required: ["question"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Keine Antwort von Gemini erhalten");

    return JSON.parse(text) as PromptResponse;

  } catch (error) {
    console.error("Error fetching prompt:", error);
    // Fallback if API fails or key is missing
    return {
      question: "Sag mir, wer du bist.",
      context: "Atme tief ein und spüre in dich hinein. Was ist jetzt gerade wahr?"
    };
  }
};
