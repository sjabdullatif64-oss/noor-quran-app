export type QuranAssistantLanguage = "english" | "arabic" | "urdu" | "hindi" | "bengali";

const QURAN_SCOPE_TERMS = [
  "quran", "koran", "ayah", "ayat", "verse", "verses", "surah", "sura", "juz",
  "tafsir", "revelation", "allah", "islam", "islamic", "muslim", "dua", "salah",
  "prayer", "zakat", "fasting", "ramadan", "sabr", "patience", "forgiveness",
  "guidance", "sin", "halal", "haram", "charity", "heaven", "paradise", "hell",
  "marriage", "divorce", "inheritance", "modesty", "backbiting", "repentance",
  "shirk", "tawheed", "prophet", "messenger", "jannah", "jahannam",
  "worship", "creator", "creation", "hereafter", "afterlife", "fiqh", "hadith",
  "worry", "worried", "anxiety", "anxious", "stress", "fear", "hardship",
  "difficulty", "illness", "sick", "pain", "healing", "protection", "evil eye",
  "sadness", "distress", "parents", "animals", "taweez", "tawiz", "amulet", "talisman", "ruqyah",
  "bimari", "dard", "shifa", "hifazat", "nazar", "pareshan", "mushkil", "walidain", "jannat",
];

const QURAN_SCOPE_TERMS_ARABIC = [
  "القرآن", "قرآن", "آية", "آيات", "سورة", "سور", "التفسير", "الله", "الإسلام",
  "إسلام", "مسلم", "دعاء", "الصلاة", "الزكاة", "الصيام", "رمضان", "الهداية",
  "الصبر", "المغفرة", "الحلال", "الحرام", "الجنة", "النار", "التوبة",
  "الرسول", "النبي",
  "فکر", "پریشان", "پریشانی", "خوف", "مشکل", "سختی", "تعویذ", "تعویز", "رقیہ",
];

const QURAN_SCOPE_TERMS_URDU = [
  "قرآن", "قرآنی", "اللہ", "اسلام", "اسلامی", "مسلمان", "نبی", "رسول", "دعا",
  "نماز", "زکوٰۃ", "زکوۃ", "روزہ", "رمضان", "ہدایت", "صبر", "مغفرت", "حلال",
  "حرام", "جنت", "جہنم", "توبہ", "قیامت",
  "فکر", "پریشانی", "خوف", "مشکل", "سختی", "بیماری", "درد", "شفا", "حفاظت",
  "تکلیف", "پروردگار", "رب", "خالق", "جہان", "جہانوں", "آسمان", "زمین",
  "عبادت", "ایمان", "نیکی", "گناہ", "قیامت", "آخرت", "یاد", "پڑھوں",
  "کس کو", "کون لوگ", "نظر", "غم", "والدین", "جانور", "تعویذ", "تعویز", "رقیہ",
];

const QURAN_SCOPE_TERMS_HINDI = [
  "कुरआन", "क़ुरआन", "अल्लाह", "इस्लाम", "मुसलमान", "दुआ", "नमाज़",
  "रोज़ा", "रमज़ान", "सब्र", "माफी", "हिदायत", "जन्नत", "जहन्नम",
  "बीमारी", "दर्द", "शिफा", "हिफाज़त", "माता-पिता",
];

const QURAN_SCOPE_TERMS_BENGALI = [
  "কুরআন", "আল্লাহ", "ইসলাম", "মুসলিম", "দোয়া", "নামাজ", "রোজা",
  "রমজান", "সবর", "ক্ষমা", "হেদায়েত", "জান্নাত", "জাহান্নাম",
  "অসুস্থ", "ব্যথা", "শিফা", "হেদায়েত",
];

const CLEARLY_UNRELATED_PATTERNS = [
  /\b(make|making|earn|earning|赚钱)\b.*\b(money|income|online|cash)\b/i,
  /\b(upwork|fiverr|freelanc(?:e|ing|er)|gig work)\b/i,
  /\b(programm?ing|javascript|typescript|python|coding|code|software|debug|api)\b/i,
  /\b(build|create|make|develop|design)\b.*\b(app|application|website|web site|software|program)\b/i,
  /\b(create|generate|make|draw)\b.*\b(image|images|photo|photos|picture|pictures|logo)\b/i,
  /\b(make friends?|friend with a girl|friend with a boy|dating|boyfriend|girlfriend)\b/i,
];

const CLEARLY_UNRELATED_URDU_PATTERNS = [
  /آن\s*لائن.*(?:ارننگ|کمائی|کمانا|پیسے|آمدن)/i,
  /(?:ارننگ|کمائی|کمانا|پیسے|آمدن).*(?:آن\s*لائن|ویب\s*سائٹ|ایپ)/i,
  /(?:اپ\s*ورک|فائیور|فری\s*لانس|لنکڈ\s*اِن|لنکڈاِن)/i,
  /(?:پروگرامنگ|کوڈنگ|ایپ\s*بنانا|ویب\s*سائٹ\s*بنانا|سافٹ\s*ویئر)/i,
  /(?:تصویر|امیج).*(?:بنانا|بنائیں|تخلیق)/i,
];

const DIRECT_THEOLOGICAL_PATTERNS = [
  /\bwho\s+(created|made)\s+(the\s+)?(world|universe)\b/i,
  /\bwho\s+(created|made)\s+(the\s+)?heavens?\s+and\s+(the\s+)?earth\b/i,
  /\bwho\s+is\s+(our\s+)?creator\b/i,
  /\bwhat\s+is\s+the\s+purpose\s+of\s+(life|our\s+life|human\s+life)\b/i,
  /\bwho\s+(created|made)\s+(human\s+beings|humans|people)\b/i,
  /دنیا\s+کس\s+نے\s+(بنائی|پیدا\s+کی)/i,
  /انسانوں?\s+کو\s+کس\s+نے\s+(بنایا|پیدا\s+کیا)/i,
];

const FOLLOW_UP_PATTERNS = [
  /^(what about this|what about that|tell me more|explain more|more about this|and this|this ayah|that ayah)\b/i,
  /اس کے بارے میں|اس آیت کے بارے میں|مزید بتاؤ|مزید بتائیں|یہ آیت|اس کا مطلب|اس کی وضاحت|اس آیت کی وضاحت|اسے آسان الفاظ میں|اس کا آسان مطلب|اس میں کیا حکم|ان کی وضاحت|ان کا مطلب|ان میں کیا حکم/i,
  /इसके बारे में|इस आयत के बारे में|और बताइए/i,
  /এটি সম্পর্কে|এই আয়াত সম্পর্কে|আরও বলুন/i,
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
  if (/\b(ass?alam|mujhe|meri|mere|kaise|kya|kis|hain|hai|mein|ke|ko|sabr|shifa|bimari|pareshan|mushkil|jannat|namaz|roza)\b/i.test(question)) {
    return "urdu";
  }
  return "english";
}

export function isQuranAssistantQuestion(question: string): boolean {
  const normalized = question.normalize("NFKC").toLocaleLowerCase().trim();
  if (CLEARLY_UNRELATED_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  if (CLEARLY_UNRELATED_URDU_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  if (DIRECT_THEOLOGICAL_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  return [
    ...QURAN_SCOPE_TERMS,
    ...QURAN_SCOPE_TERMS_ARABIC,
    ...QURAN_SCOPE_TERMS_URDU,
    ...QURAN_SCOPE_TERMS_HINDI,
    ...QURAN_SCOPE_TERMS_BENGALI,
  ]
    .some((term) => normalized.includes(term.toLocaleLowerCase()));
}

export function isQuranAssistantFollowUp(
  question: string,
  hasConversationContext: boolean,
): boolean {
  return hasConversationContext && FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(question.trim()));
}

export function quranAssistantErrorMessage(language: QuranAssistantLanguage): string {
  switch (language) {
    case "arabic":
      return "حدثت مشكلة أثناء الحصول على الإجابة. يرجى المحاولة مرة أخرى.";
    case "urdu":
      return "جواب حاصل کرنے میں مسئلہ پیش آیا۔ براہ کرم دوبارہ کوشش کریں۔";
    case "hindi":
      return "उत्तर प्राप्त करने में समस्या हुई। कृपया फिर कोशिश करें।";
    case "bengali":
      return "উত্তর পেতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
    default:
      return "There was a problem getting the answer. Please try again.";
  }
}

export function quranAssistantRegistrationMessage(language: QuranAssistantLanguage): string {
  switch (language) {
    case "arabic":
      return "يلزم التسجيل قبل استخدام مساعد القرآن.";
    case "urdu":
      return "قرآن اسسٹنٹ استعمال کرنے سے پہلے رجسٹریشن ضروری ہے۔";
    case "hindi":
      return "कुरआन असिस्टेंट इस्तेमाल करने से पहले पंजीकरण आवश्यक है।";
    case "bengali":
      return "কুরআন অ্যাসিস্ট্যান্ট ব্যবহার করার আগে নিবন্ধন প্রয়োজন।";
    default:
      return "Registration is required before using Quran Assistant.";
  }
}

export function quranAssistantLimitMessage(language: QuranAssistantLanguage): string {
  switch (language) {
    case "arabic":
      return "تم بلوغت الحد اليومي لأسئلة مساعد القرآن.";
    case "urdu":
      return "قرآن اسسٹنٹ کے روزانہ سوالات کی حد مکمل ہو گئی ہے۔";
    case "hindi":
      return "कुरआन असिस्टेंट के दैनिक प्रश्नों की सीमा पूरी हो गई है।";
    case "bengali":
      return "কুরআন অ্যাসিস্ট্যান্টের দৈনিক প্রশ্নের সীমা পূর্ণ হয়েছে।";
    default:
      return "The daily Quran Assistant question limit has been reached.";
  }
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