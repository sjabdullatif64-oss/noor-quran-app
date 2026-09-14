export type QuranAssistantLanguage = "english" | "arabic" | "urdu" | "hindi" | "bengali";

const QURAN_SCOPE_TERMS = [
  "quran", "koran", "ayah", "ayat", "verse", "verses", "surah", "sura", "juz",
  "tafsir", "revelation", "allah", "islam", "islamic", "muslim", "dua", "salah",
  "prayer", "zakat", "fasting", "ramadan", "sabr", "patience", "forgiveness",
  "guidance", "sin", "halal", "haram", "charity", "heaven", "paradise", "hell",
  "marriage", "divorce", "inheritance", "modesty", "backbiting", "repentance",
  "shirk", "tawheed", "prophet", "messenger", "jannah", "jahannam",
];

const QURAN_SCOPE_TERMS_ARABIC = [
  "القرآن", "قرآن", "آية", "آيات", "سورة", "سور", "التفسير", "الله", "الإسلام",
  "إسلام", "مسلم", "دعاء", "الصلاة", "الزكاة", "الصيام", "رمضان", "الهداية",
  "الصبر", "المغفرة", "الحلال", "الحرام", "الجنة", "النار", "التوبة",
  "الرسول", "النبي",
];

const CLEARLY_UNRELATED_PATTERNS = [
  /\b(make|making|earn|earning|赚钱)\b.*\b(money|income|online|cash)\b/i,
  /\b(programm?ing|javascript|typescript|python|coding|code|software|debug|api)\b/i,
  /\b(image|images|photo|photos|picture|pictures|logo|design|draw|video)\b/i,
  /\b(business|startup|marketing|sales|technology|tech|computer)\b/i,
  /\b(stock|crypto|bitcoin|investment|investing|trading)\b/i,
  /\b(relationship|dating|boyfriend|girlfriend)\b/i,
];

export function detectQuranAssistantLanguage(question: string, requested?: string): QuranAssistantLanguage {
  if (/[\u0600-\u06ff]/.test(question)) {
    return /[\u0679\u0686\u0688\u06be\u06d2]/.test(question) ? "urdu" : "arabic";
  }
  if (/[\u0900-\u097f]/.test(question)) return "hindi";
  if (/[\u0980-\u09ff]/.test(question)) return "bengali";
  const normalized = requested?.toLowerCase();
  if (normalized === "arabic" || normalized === "urdu" || normalized === "hindi" || normalized === "bengali") {
    return normalized;
  }
  return "english";
}

export function isQuranAssistantQuestion(question: string): boolean {
  const normalized = question.toLocaleLowerCase();
  if (CLEARLY_UNRELATED_PATTERNS.some((pattern) => pattern.test(question))) return false;
  return [...QURAN_SCOPE_TERMS, ...QURAN_SCOPE_TERMS_ARABIC]
    .some((term) => normalized.includes(term.toLocaleLowerCase()));
}

export function quranAssistantScopeRefusal(language: QuranAssistantLanguage): string {
  switch (language) {
    case "arabic":
      return "أنا هنا لمساعدتك في الأسئلة المتعلقة بالقرآن وآياته والهداية القرآنية. يرجى طرح سؤال متعلق بالقرآن.";
    case "urdu":
      return "میں قرآن، قرآن کی آیات اور قرآن کی ہدایت سے متعلق سوالات میں مدد کے لیے حاضر ہوں۔ براہِ کرم قرآن سے متعلق سوال پوچھیں۔";
    case "hindi":
      return "मैं कुरआन, कुरआन की आयतों और कुरआनी मार्गदर्शन से जुड़े सवालों में मदद के लिए यहाँ हूँ। कृपया कुरआन से संबंधित सवाल पूछें।";
    case "bengali":
      return "আমি কুরআন, কুরআনের আয়াত এবং কুরআনের নির্দেশনা সম্পর্কিত প্রশ্নে সাহায্য করতে পারি। অনুগ্রহ করে কুরআন-সম্পর্কিত প্রশ্ন করুন।";
    default:
      return "I’m here to help with questions about the Quran, Quranic verses, and Quranic guidance. Please ask me a Quran-related question.";
  }
}