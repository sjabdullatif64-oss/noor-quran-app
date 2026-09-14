export type QuranAssistantReference = {
  surahNumber: number;
  ayahNumber: number;
};

type QuranAssistantLanguage = "english" | "arabic" | "urdu" | "hindi" | "bengali";

const TOPIC_REFERENCES: Array<{
  patterns: RegExp[];
  references: QuranAssistantReference[];
}> = [
  {
    patterns: [
      /\b(patience|patient|sabr|no patience|lose patience)\b/i,
      /صبر|صبری|صبر نہیں/i,
      /الصبر|صابر/i,
    ],
    references: [{ surahNumber: 2, ayahNumber: 153 }],
  },
  {
    patterns: [
      /\b(worr(?:y|ied|ies)|anxious|anxiety|stress|distressed|heart feels heavy)\b/i,
      /فکر|پریشان|پریشانی|گھبراہٹ/i,
      /قلق|همّ|حزن/i,
    ],
    references: [{ surahNumber: 13, ayahNumber: 28 }],
  },
  {
    patterns: [
      /\b(forgive|forgiveness|mercy|sin|sins)\b/i,
      /معافی|مغفرت|گناہ/i,
      /مغفرة|رحمة|ذنب/i,
    ],
    references: [{ surahNumber: 39, ayahNumber: 53 }],
  },
  {
    patterns: [
      /\b(fear|afraid|scared|terror)\b/i,
      /خوف|ڈر|ڈرا ہوا/i,
      /خوف|فزع/i,
    ],
    references: [{ surahNumber: 3, ayahNumber: 175 }],
  },
  {
    patterns: [
      /\b(hardship|hard times|difficult times|difficulty|ease|trouble)\b/i,
      /مشکل|سختی|پریشانی کے وقت/i,
      /الشدة|العسر|المشقة/i,
    ],
    references: [
      { surahNumber: 94, ayahNumber: 5 },
      { surahNumber: 94, ayahNumber: 6 },
    ],
  },
  {
    patterns: [
      /\b(repent|repentance|return to Allah)\b/i,
      /توبہ|اللہ کی طرف رجوع/i,
      /توبة|استغفار/i,
    ],
    references: [{ surahNumber: 39, ayahNumber: 53 }],
  },
  {
    patterns: [
      /\b(gratitude|grateful|thankful|thank Allah)\b/i,
      /شکر|شکرگزاری/i,
      /شكر|امتنان/i,
    ],
    references: [{ surahNumber: 14, ayahNumber: 7 }],
  },
  {
    patterns: [
      /\b(guidance|right path|straight path|lost)\b/i,
      /ہدایت|سیدھا راستہ|گمراہ/i,
      /هداية|الصراط المستقيم|ضلال/i,
    ],
    references: [{ surahNumber: 1, ayahNumber: 6 }],
  },
  {
    patterns: [
      /\b(taweez|tawiz|amulet|talisman|ruqyah)\b/i,
      /تعویذ|تعویز|رقیہ/i,
      /تميمة|رقية/i,
    ],
    references: [
      { surahNumber: 113, ayahNumber: 1 },
      { surahNumber: 10, ayahNumber: 107 },
    ],
  },
];

const VERSE_REQUEST_PATTERN = /\b(which|what|give me|show me|read|recite|recommend|need|find)\b.{0,80}\b(ayah|ayat|verse|surah|quran|read)\b|\b(ayah|ayat|verse|surah)\b.{0,80}\b(read|recommend|give|show|need|for)\b/i;
const VERSE_REQUEST_PATTERN_ARABIC = /آية|آيات|سورة|آیت|آیات|پڑھوں|پڑھنے|بتائیں|دیں|دلائیں/;

function matchesAny(question: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question));
}

function isVerseRequest(question: string): boolean {
  return VERSE_REQUEST_PATTERN.test(question) || VERSE_REQUEST_PATTERN_ARABIC.test(question);
}

export function getSuggestedQuranReferences(question: string): QuranAssistantReference[] {
  const normalized = question.normalize("NFKC").trim();
  const suggestions: QuranAssistantReference[] = [];
  for (const topic of TOPIC_REFERENCES) {
    if (!matchesAny(normalized, topic.patterns)) continue;
    if (!isVerseRequest(normalized) && !topic.patterns.some((pattern) => /taweez|tawiz|amulet|talisman|ruqyah|تعویذ|تعویز|رقیہ|تميمة|رقية/i.test(pattern.source))) {
      continue;
    }
    for (const reference of topic.references) {
      if (!suggestions.some((item) => item.surahNumber === reference.surahNumber && item.ayahNumber === reference.ayahNumber)) {
        suggestions.push(reference);
      }
    }
  }
  return suggestions.slice(0, 3);
}

export function getDirectIslamicAnswer(question: string, language: QuranAssistantLanguage): string | null {
  const normalized = question.normalize("NFKC").trim();
  const creationQuestion = /\bwho\s+(created|made)\s+(the\s+)?(world|universe)\b/i.test(normalized)
    || /\bwho\s+(created|made)\s+(the\s+)?heavens?\s+and\s+(the\s+)?earth\b/i.test(normalized)
    || /دنیا\s+کس\s+نے\s+(بنائی|پیدا\s+کی)/i.test(normalized);
  if (!creationQuestion) return null;
  switch (language) {
    case "arabic":
      return "الله خلق السماوات والأرض وكل ما فيهما.";
    case "urdu":
      return "اللہ نے آسمانوں اور زمین اور جو کچھ ان میں ہے سب کو پیدا کیا۔";
    case "hindi":
      return "अल्लाह ने आकाशों और धरती और जो कुछ उनमें है, सबको पैदा किया।";
    case "bengali":
      return "আল্লাহ আকাশমণ্ডলী, পৃথিবী এবং তাদের মধ্যে যা কিছু আছে সব সৃষ্টি করেছেন।";
    default:
      return "Allah created the heavens and the earth and everything in them.";
  }
}

export function getFallbackExplanation(question: string, language: QuranAssistantLanguage): string | null {
  const normalized = question.normalize("NFKC").trim();
  if (getDirectIslamicAnswer(normalized, language)) return getDirectIslamicAnswer(normalized, language);
  const references = getSuggestedQuranReferences(normalized);
  if (!references.length) return null;
  if (/\b(patience|patient|sabr|صبر|الصبر)\b/i.test(normalized)) {
    return language === "urdu"
      ? "صبر کے بارے میں قرآن کی ایک مستند آیت نیچے دی گئی ہے۔ اسے پڑھتے ہوئے اللہ سے مدد مانگیں۔"
      : "The verified Ayah below is directly about patience. Read it while asking Allah for help.";
  }
  if (/\b(worr(?:y|ied|ies)|anxious|anxiety|stress|فکر|پریشان|قلق|همّ)\b/i.test(normalized)) {
    return language === "urdu"
      ? "فکر کے وقت نیچے دی گئی مستند آیت اللہ کے ذکر اور دل کے اطمینان کی طرف رہنمائی کرتی ہے۔"
      : "The verified Ayah below addresses worry by directing the heart toward the remembrance of Allah.";
  }
  if (/\b(taweez|tawiz|amulet|talisman|ruqyah|تعویذ|تعویز|رقیہ|تميمة|رقية)\b/i.test(normalized)) {
    return language === "urdu"
      ? "اگر تعویذ کے بارے میں شبہ ہے تو اس کے نامعلوم الفاظ یا دعووں پر بھروسا نہ کریں۔ اس مخصوص معاملے کا حکم کسی قابلِ اعتماد، مستند اسلامی عالم سے معلوم کریں۔"
      : "If you are unsure about a taweez, do not rely on unknown words or claims in it. Ask a trustworthy qualified Islamic scholar to review the specific matter.";
  }
  return language === "urdu"
    ? "آپ کے سوال سے متعلق مستند قرآن کی آیت نیچے دی گئی ہے۔"
    : "A verified Quran Ayah relevant to your question is provided below.";
}

export function isGenericAssistantText(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  return text.length < 260 && /^(according to (the )?quran|i can (help|answer|provide)|i['’]?m here to|the quran assistant|میں قرآن|میں آپ کی مدد)/i.test(text);
}

export function getFallbackGuidance(question: string, language: QuranAssistantLanguage): string | null {
  const normalized = question.normalize("NFKC").trim();
  if (!/\b(taweez|tawiz|amulet|talisman|ruqyah)\b|تعویذ|تعویز|رقیہ|تميمة|رقية/i.test(normalized)) return null;
  if (language === "urdu") {
    return "تعویذ کے بارے میں قطعی حکم اس کے اصل الفاظ، مقصد اور حالات دیکھے بغیر نہیں دیا جا سکتا۔ اگر اس میں نامعلوم تحریر، symbols یا غیر واضح دعوے ہوں تو اسے مؤثر یا یقینی حفاظت کا ذریعہ نہ سمجھیں۔ کسی قابلِ اعتماد، مستند اسلامی عالم سے براہِ راست مشورہ کریں۔";
  }
  return "A specific ruling about a taweez depends on its actual words, purpose, and circumstances. If it contains unknown writing, symbols, or unclear claims, do not treat it as a guaranteed source of protection. Consult a trustworthy qualified Islamic scholar directly.";
}