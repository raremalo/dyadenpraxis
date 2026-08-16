/**
 * Client-Einstieg für den Dyaden-Fragen-Katalog: re-exportiert die
 * kanonischen Kategorien aus shared/categories.ts (L5-01) und hält die
 * client-seitigen Helfer (Random-Pick, Flachliste).
 */
import { DYAD_CATEGORIES } from '../shared/categories';

export { DYAD_CATEGORIES };
export type { DyadCategory } from '../shared/categories';

export interface DyadQuestion {
  text: string;
  category: string;
}

export function getRandomQuestion(categoryKey?: string): DyadQuestion {
  if (categoryKey) {
    const category = DYAD_CATEGORIES.find((c) => c.key === categoryKey);
    if (category && category.questions.length > 0) {
      const text =
        category.questions[Math.floor(Math.random() * category.questions.length)];
      return { text, category: category.name };
    }
  }

  const allQuestions = getAllQuestions();
  const picked = allQuestions[Math.floor(Math.random() * allQuestions.length)];
  return picked;
}

export function getAllQuestions(): DyadQuestion[] {
  return DYAD_CATEGORIES.flatMap((category) =>
    category.questions.map((text) => ({ text, category: category.name }))
  );
}
