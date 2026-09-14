import { Router } from "express";
import { z } from "zod";

const router = Router();

const requestSchema = z.object({
  question: z.string().trim().min(2).max(1200),
  language: z.string().trim().min(2).max(40).optional(),
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

function detectLanguage(question: string, requested?: string): string {
  if (/[\u0600-\u06ff]/.test(question)) return /[\u0679\u0686\u0688\u06be\u06d2]/.test(question) ? "urdu" : "arabic";
  if (/[\u0900-\u097f]/.test(question)) return "hindi";
  if (/[\u0980-\u09ff]/.test(question)) return "bengali";
  return requested?.toLowerCase() || "english";
}

async function aiRequest(question: string, language: string): Promise<{ refs: z.infer<typeof referenceSchema>[]; explanation: string; guidance: string }> {
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
            "Return JSON only with keys references (array of up to 3 objects with surahNumber and ayahNumber), explanation, and guidance.",
            "Select references conservatively. If you cannot identify a reliable relevant Quran passage, return an empty references array.",
            "Do not put Arabic Quran text, translations, surah names, or verse references inside explanation or guidance; those belong only in the verified result cards.",
            "Do not issue fatwas or claim guaranteed medical, supernatural, or religious cures. For illness, worry, or protection, provide general guidance and recommend qualified professionals where appropriate.",
            `The user's language is ${language}.`,
          ].join(" "),
        },
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
  const obj = parsed as { references?: unknown; explanation?: unknown; guidance?: unknown };
  const refs = z.array(referenceSchema).max(3).safeParse(obj.references ?? []);
  if (!refs.success) return { refs: [], explanation: "I could not verify a Quran reference for this question.", guidance: "" };
  return {
    refs: refs.data,
    explanation: typeof obj.explanation === "string" ? obj.explanation : "",
    guidance: typeof obj.guidance === "string" ? obj.guidance : "",
  };
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

router.post("/", async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter a question." });
    return;
  }
  try {
    const language = detectLanguage(parsed.data.question, parsed.data.language);
    const answer = await aiRequest(parsed.data.question, language);
    const verified = (await Promise.all(answer.refs.map((ref) => verifiedAyah(ref.surahNumber, ref.ayahNumber, language)))).filter(
      (ayah): ayah is VerifiedAyah => ayah !== null,
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({ language, explanation: answer.explanation, guidance: answer.guidance, ayahs: verified });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Unable to answer right now." });
  }
});

export default router;