/**
 * Noor Quran — AI Quran Teacher: central configuration
 *
 * ALL tunable limits and thresholds for the Teacher feature live here.
 * No screen may hardcode these values.
 *
 * FEATURE FLAG: The AI Teacher is temporarily disabled while the native Android
 * microphone flow is under investigation. Set to `true` to re-enable once the
 * root cause is fixed and tested.
 */
export const AI_TEACHER_ENABLED = false;

/** Maximum NEW micro-lessons a learner may complete per day (resets local midnight). */
export const DAILY_LIMIT = 10;

/** Word-match percentage (0–100) required to pass a speaking lesson. */
export const PASS_SCORE = 70;

/**
 * After this many failed attempts on one lesson, show extra help
 * (slower guidance + offer to continue in listen-only mode).
 */
export const MAX_RETRIES = 3;

/** Recognition confidence (0–1) below which we say "couldn't hear clearly" instead of marking wrong. */
export const MIN_CONFIDENCE = 0.3;

/** Max recording duration (ms) for the press-and-hold mic. */
export const MAX_RECORD_MS = 10000;

/** Curriculum levels enabled in this phase. Levels 5–7 are future phases. */
export const ENABLED_LEVELS = [1, 2, 3, 4] as const;

/** Speech recognizer language (Arabic — Saudi Arabia). */
export const SPEECH_LANG = "ar-SA";

/** Word-by-word verified recitation audio (Quran.com CDN). */
export const WBW_AUDIO_BASE = "https://audio.qurancdn.com/wbw";

/** Full-ayah verified recitation (Alafasy) — same CDN as the rest of the app. */
export const AYAH_AUDIO_BASE = "https://cdn.islamic.network/quran/audio/128/ar.alafasy";

/** Number of weakest lessons pulled into a Smart Revision session. */
export const REVISION_SIZE = 5;

// ── Storage keys (all Teacher data uses the noor-teacher- prefix) ────────────
export const TEACHER_PROGRESS_KEY = "noor-teacher-progress-v1";
export const TEACHER_CONSENT_KEY = "noor-teacher-consent";
export const TEACHER_REVISION_KEY = "noor-teacher-revision-queue";

/** Build the word-by-word MP3 URL: surah/ayah/word are 1-based. */
export function wbwAudioUrl(surah: number, ayah: number, word: number): string {
  const s = String(surah).padStart(3, "0");
  const a = String(ayah).padStart(3, "0");
  const w = String(word).padStart(3, "0");
  return `${WBW_AUDIO_BASE}/${s}_${a}_${w}.mp3`;
}
