import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  findUserByDeviceId,
  finishQuranAssistantQuestion,
  getQuranAssistantUsage,
  reserveQuranAssistantQuestion,
} from "../lib/sheets";
import {
  detectQuranAssistantLanguage,
  isQuranAssistantQuestion,
  isQuranAssistantFollowUp,
  quranAssistantErrorMessage,
  quranAssistantLimitMessage,
  quranAssistantRegistrationMessage,
  quranAssistantScopeRefusal,
  type QuranAssistantLanguage,
} from "../lib/quran-assistant-scope";
import {
  getDirectIslamicAnswer,
  getFallbackExplanation,
  getFallbackGuidance,
  getSuggestedQuranReferences,
  isGenericAssistantText,
  type QuranAssistantReference,
} from "../lib/quran-assistant-behavior";
import {
  buildQuranAssistantQuestion,
  getSelectedAyahReference,
  type QuranAssistantConversationMessage,
  type QuranAssistantAyahContext,
} from "../lib/quran-assistant-request";

const router = Router();

const ayahContextSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  surahName: z.string().min(1).max(200),
  surahEnglishName: z.string().min(1).max(200),
  ayahNumber: z.number().int().min(1).max(286),
  arabic: z.string().min(1).max(12000),
  translation: z.string().max(12000),
  transliteration: z.string().max(12000).optional(),
  audioGlobalNumber: z.number().int().min(1).max(7000),
});

const requestSchema = z.object({
  question: z.string().trim().min(2).max(1200),
  language: z.string().trim().min(2).max(40).optional(),
  deviceId: z.string().min(1).max(200),
  ayahContext: ayahContextSchema.optional(),
  conversation: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2400),
  })).max(10).optional(),
});

const usageQuerySchema = z.object({
  deviceId: z.string().min(1).max(200),
});

const EDITIONS: Record<string, string> = {
  english: "en.sahih",
  urdu: "ur.jalandhry",
  arabic: "ar.alafasy",
  hindi: "hi.hindi",
  bengali: "bn.bengali",
  turkish: "tr.diyanet",
  indonesian: "id.indonesian",
  french: "fr.hamidullah",
  spanish: "es.asad",
  persian: "fa.ansarian",
  russian: "ru.kuliev",
  malay: "ms.basmeih",
  german: "de.bubenheim",
};

const referenceSchema = z.object({
  surahNumber: z.number().int().min(1).max(114),
  ayahNumber: z.number().int().min(1).max(286),
});

type VerifiedAyah = {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  translation: string;
  audioGlobalNumber: number;
};

function detectLanguage(question: string, requested?: string): QuranAssistantLanguage {
  return detectQuranAssistantLanguage(question, requested);
}

function questionRequestsQuranReferences(question: string): boolean {
  return /\b(reference|references|evidence|proof|source|sources|ayah|ayat|verse|verses|surah|sura|tafsir|explain|explanation|guidance|what does the quran say|according to the quran)\b/i.test(question)
    || /آية|آيات|سورة|دليل|مرجع|مراجع|تفسير|اشرح|شرح|هداية|القرآن يقول|القرآن عن|پڑھوں|پڑھنے|بتائیں|دیں/.test(question)
    || /आयत|आयात|सूरह|कुरआन|क़ुरआन|बताइए|पढ़ूं|मार्गदर्शन|समझाएं/.test(question)
    || /আয়াত|আয়াতগুলো|সূরা|কুরআন|বলুন|পড়ব|নির্দেশনা|ব্যাখ্যা/.test(question)
    || /\b(which|what|give me|show me|read|recite|recommend)\b.{0,80}\b(ayah|ayat|verse|surah|quran)\b/i.test(question);
}

async function aiRequest(
  question: string,
  language: string,
  conversation: QuranAssistantConversationMessage[] = [],
): Promise<{
  refs: z.infer<typeof referenceSchema>[];
  explanation: string;
  guidance: string;
  includeReferences: boolean;
}> {
  const base = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const key = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!base || !key) throw new Error("Quran Assistant is not configured");

  const response = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-5.6-terra",
      max_completion_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are Quran Assistant, a careful Quran study helper.",
            "Reply in the user's language. Never invent Quran text, translations, references, hadith, or religious claims.",
            "Return JSON only with keys references (array of up to 3 objects with surahNumber and ayahNumber), explanation, guidance, and includeReferences (boolean).",
            "Understand the user's actual intention and answer the question directly. Do not begin with a generic capability statement such as 'I can answer according to the Quran' or 'I can help with Quran questions'.",
            "For a simple, direct, well-established Islamic question, give the direct answer first in natural language. Do not replace the answer with the phrase 'According to the Quran'.",
            "Set includeReferences to true and return the most relevant reference coordinates when the user asks for an Ayah, verse, Surah, Quran evidence, or Quranic guidance.",
            "For requests such as patience, worry, forgiveness, fear, hardship, repentance, gratitude, guidance, illness, pain, protection, evil eye, distress, sadness, parents, or Paradise, select a directly relevant Quran passage rather than a generic topic mention.",
            "If the user asks which Ayah to read or asks to be given an Ayah, you must return at least one relevant reference coordinate when you can identify one.",
            "Select references conservatively. If you cannot identify a reliable relevant Quran passage, return includeReferences false and an empty references array.",
            "Do not put Arabic Quran text, translations, surah names, or verse references inside explanation or guidance; those belong only in the verified result cards.",
            "For illness, pain, or healing, do not promise a cure or replace medical care. Clearly distinguish Quranic guidance from Hadith-based duas or practices.",
            "Never invent Quran verses, translations, references, or religious claims. If the Quran does not clearly establish the answer, say that clearly instead of presenting an unsupported claim as Quranic.",
            "Do not issue fatwas or claim guaranteed medical, supernatural, or religious cures. For personal concerns such as taweez, protection, worry, or fear, address the concern respectfully, avoid unsupported claims, and recommend a trustworthy qualified Islamic scholar when a specific ruling is needed.",
            "When an Ayah is requested, return only reference coordinates; the server will retrieve the exact verified Arabic text and user's-language translation.",
            `The user's language is ${language}.`,
          ].join(" "),
        },
        ...conversation.map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        })),
        { role: "user", content: question },
      ],
    }),
  });
  if (!response.ok) throw new Error("The Quran Assistant could not respond");
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("The Quran Assistant returned an empty response");
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new Error("The Quran Assistant returned an invalid response"); }
  const obj = parsed as { references?: unknown; explanation?: unknown; guidance?: unknown; includeReferences?: unknown };
  const refs = z.array(referenceSchema).max(3).safeParse(obj.references ?? []);
  if (!refs.success) {
    return { refs: [], explanation: "I could not verify a Quran reference for this question.", guidance: "", includeReferences: false };
  }
  const requestedReferences = questionRequestsQuranReferences(question);
  const includeReferences = requestedReferences && (obj.includeReferences === true || refs.data.length > 0);
  return {
    refs: includeReferences ? refs.data : [],
    explanation: typeof obj.explanation === "string" ? obj.explanation : "",
    guidance: typeof obj.guidance === "string" ? obj.guidance : "",
    includeReferences,
  };
}

function uniqueReferences(references: QuranAssistantReference[]): QuranAssistantReference[] {
  return references.filter((reference, index) => references.findIndex((item) => (
    item.surahNumber === reference.surahNumber && item.ayahNumber === reference.ayahNumber
  )) === index).slice(0, 3);
}

async function verifiedAyah(surahNumber: number, ayahNumber: number, language: string): Promise<VerifiedAyah | null> {
  const edition = EDITIONS[language] ?? EDITIONS.english;
  const [arabicResponse, translationResponse] = await Promise.all([
    fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/ar.alafasy`),
    fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/${edition}`),
  ]);
  if (!arabicResponse.ok || !translationResponse.ok) return null;
  const arabic = await arabicResponse.json() as { data?: { number?: number; text?: string; surah?: { name?: string; number?: number } } };
  const translated = await translationResponse.json() as { data?: { text?: string; surah?: { name?: string } } };
  const a = arabic.data;
  const t = translated.data;
  if (!a?.text || !t?.text || !a.surah?.name || !a.number) return null;
  return {
    surahNumber,
    surahName: a.surah.name,
    ayahNumber,
    arabic: a.text,
    translation: t.text,
    audioGlobalNumber: a.number,
  };
}

router.get("/usage", async (req, res) => {
  const parsed = usageQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Registration is required." });
    return;
  }
  const user = await findUserByDeviceId(parsed.data.deviceId);
  if (!user) {
    res.status(401).json({ error: "Registration is required." });
    return;
  }
  try {
    const usage = await getQuranAssistantUsage(user.id);
    res.setHeader("Cache-Control", "no-store");
    res.json({ usage });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Usage is temporarily unavailable." });
  }
});

router.post("/", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a question." });
    return;
  }
  const language = detectLanguage(parsed.data.question, parsed.data.language);
  // Scope-check the user's actual question, not selected Ayah text. Quran
  // context must never make an unrelated question appear in-scope.
  const hasConversationContext = Boolean(parsed.data.ayahContext || parsed.data.conversation?.length);
  if (!isQuranAssistantQuestion(parsed.data.question)
    && !isQuranAssistantFollowUp(parsed.data.question, hasConversationContext)) {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      responseId: randomUUID(),
      language,
      explanation: quranAssistantScopeRefusal(language),
      guidance: "",
      ayahs: [],
      scopeRejected: true,
    });
    return;
  }
  const assistantQuestion = buildQuranAssistantQuestion(parsed.data.question, parsed.data.ayahContext);
  const selectedAyahReference = getSelectedAyahReference(parsed.data.ayahContext);
  const user = await findUserByDeviceId(parsed.data.deviceId);
  if (!user) {
    res.status(401).json({ error: quranAssistantRegistrationMessage(language) });
    return;
  }
  const reservation = await reserveQuranAssistantQuestion(user.id);
  if (!reservation.allowed || !reservation.reservationId) {
    res.setHeader("Cache-Control", "no-store");
    res.status(429).json({
      error: quranAssistantLimitMessage(language),
      usage: reservation.usage,
    });
    return;
  }
  try {
    const answer = await aiRequest(assistantQuestion, language, parsed.data.conversation);
    const suggestedReferences = getSuggestedQuranReferences(parsed.data.question);
    const referenceCandidates = uniqueReferences([...selectedAyahReference, ...suggestedReferences, ...answer.refs]);
    const verified = (await Promise.all(referenceCandidates.map((ref) => verifiedAyah(ref.surahNumber, ref.ayahNumber, language)))).filter(
      (ayah): ayah is VerifiedAyah => ayah !== null,
    );
    const directAnswer = getDirectIslamicAnswer(parsed.data.question, language);
    const fallbackExplanation = getFallbackExplanation(parsed.data.question, language);
    const explanation = directAnswer
      || (!isGenericAssistantText(answer.explanation) ? answer.explanation : fallbackExplanation)
      || answer.explanation
      || "I could not prepare a clear answer right now.";
    const guidance = (!isGenericAssistantText(answer.guidance) ? answer.guidance : null)
      || getFallbackGuidance(parsed.data.question, language)
      || "";
    const usage = await finishQuranAssistantQuestion(user.id, reservation.reservationId, true);
    res.setHeader("Cache-Control", "no-store");
    res.json({ responseId: randomUUID(), language, explanation, guidance, ayahs: verified, usage });
  } catch (error) {
    await finishQuranAssistantQuestion(user.id, reservation.reservationId, false).catch(() => {});
    res.status(502).json({ error: quranAssistantErrorMessage(language) });
  }
});

export default router;