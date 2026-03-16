export interface DyadQuestion {
  text: string;
  category: string;
}

export interface DyadCategory {
  key: string;
  name: string;
  icon: string;
  questions: string[];
}

export const DYAD_CATEGORIES: DyadCategory[] = [
  {
    key: "existenziell",
    name: "Existenziell",
    icon: "🌟",
    questions: [
      "Wer bin ich?",
      "Was bin ich?",
      "Was ist Leben?",
      "Was ist ein Anderer?",
      "Was ist Liebe?",
    ],
  },
  {
    key: "praesenz",
    name: "Präsenz & Achtsamkeit",
    icon: "🧘",
    questions: [
      "Dich öffnen und beobachten, was nimmst du wahr?",
      "Präsent sein mit allem was ist, was erlebst du jetzt?",
      "Dich deiner Präsenz hingebend, was nimmst du jetzt wahr?",
      "Empfänglich sein für alles was ist, was erlebst du jetzt?",
      "Was ist in dir gerade lebendig?",
      "Was möchtest du mir gerade mitteilen?",
      "Was nimmst du in diesem Moment in deinem Körper wahr?",
      "Wie bist du in der Welt, wenn du ganz du selbst bist?",
    ],
  },
  {
    key: "mitgefuehl",
    name: "Mitgefühl & Verbindung",
    icon: "💚",
    questions: [
      "Das Leben in dir umarmen, was nimmst du wahr?",
      "Sich selbst mit Liebenswürdigkeit zu segnen. Wie fühlst du dich?",
      "Dich auf die Schwingung deines Herzens einstimmen. Was taucht in dir auf?",
      "Dankbar für den Raum, den wir teilen, wofür bist du dankbar?",
      "Wie geht es dir mit deiner Verbindung zu anderen Menschen?",
      "Was bedeutet Mitgefühl für dich in diesem Moment?",
      "Wofür bist du heute dankbar?",
    ],
  },
  {
    key: "emotionen",
    name: "Emotionen & Gefühle",
    icon: "😌",
    questions: [
      "Welche Emotion nimmst du gerade in dir wahr?",
      "Wie geht es dir mit herausfordernden Gefühlen?",
      "Was brauchst du gerade emotional?",
      "Welches Gefühl möchte gerade gesehen werden?",
      "Wie zeigt sich Freude in deinem Leben?",
      "Was macht dich traurig, wenn du jetzt hinschaust?",
    ],
  },
  {
    key: "selbsterforschung",
    name: "Selbsterforschung",
    icon: "🔍",
    questions: [
      "Was ist deine tiefste Wahrheit in diesem Moment?",
      "Welche Überzeugung hält dich gerade fest?",
      "Was verbirgt sich hinter deinen Gedanken?",
      "Welche Maske trägst du im Alltag?",
      "Was möchte durch dich erfahren werden?",
      "Welcher Teil von dir möchte gehört werden?",
      "Was taucht in dir auf, wenn du dich selbst akzeptierst?",
    ],
  },
  {
    key: "stress",
    name: "Stress & Herausforderungen",
    icon: "⚡",
    questions: [
      "Erzähle von einer aktuellen Stresssituation: Wie war sie? Was ging in dir vor?",
      "Welche Stressverhaltensmuster nimmst du bei dir wahr?",
      "Wie reagiert dein Körper auf Stress?",
      "Was brauchst du, um mit Stress besser umzugehen?",
      "Was ist deine größte Herausforderung gerade?",
    ],
  },
  {
    key: "perspektiven",
    name: "Perspektiven & Wachstum",
    icon: "🌈",
    questions: [
      "Wie hat sich dein Verständnis über dieses Thema verändert?",
      "Welche neue Perspektive möchte sich zeigen?",
      "Was sind die neuen kritischen Punkte, die du erkennst?",
      "Wo handelst du noch auf eine Art, die nicht mehr passt?",
      "Welcher nächste Schritt möchte gegangen werden?",
      "Welche Unterstützung brauchst du für dein Wachstum?",
    ],
  },
  {
    key: "beduerfnisse",
    name: "Bedürfnisse & Wünsche",
    icon: "🎯",
    questions: [
      "Was brauchst du wirklich in deinem Leben?",
      "Welches unerfüllte Bedürfnis spürst du?",
      "Was möchte in deinem Leben mehr Raum haben?",
      "Wovon möchtest du loslassen?",
      "Was ist deine tiefste Sehnsucht?",
      "Wonach sehnt sich das Leben in dir in diesem Moment?",
    ],
  },
  {
    key: "beziehungen",
    name: "Beziehungen & Gemeinschaft",
    icon: "🌍",
    questions: [
      "Wie erlebst du Verbindung zu anderen?",
      "Was bedeutet Gemeinschaft für dich?",
      "Welche Rolle spielst du in Beziehungen?",
      "Wie zeigt sich Liebe in deinen Beziehungen?",
      "Was hindert dich daran, dich wirklich zu zeigen?",
    ],
  },
  {
    key: "moeglichkeiten",
    name: "Möglichkeiten & Zukunft",
    icon: "🔮",
    questions: [
      "Offen für das Feld der unzähligen Möglichkeiten, was erwacht in dir?",
      "Welche Vision möchte sich durch dich verwirklichen?",
      "Was möchte in der Welt durch dich entstehen?",
      "Welche konkrete Initiative würde Sinn machen?",
      "Wie sähe dein ideales Leben aus?",
      "Was wäre, wenn Vertrauen dich heute leiten würde?",
    ],
  },
];

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

export function getCategoryByKey(key: string): DyadCategory | undefined {
  return DYAD_CATEGORIES.find((c) => c.key === key);
}

export function getAllQuestions(): DyadQuestion[] {
  return DYAD_CATEGORIES.flatMap((category) =>
    category.questions.map((text) => ({ text, category: category.name }))
  );
}
