/**
 * Noor Quran — AI Quran Teacher: recitation assessment
 *
 * Privacy-first: audio is processed by the DEVICE's speech recognizer
 * (Android SpeechRecognizer via @capacitor-community/speech-recognition,
 * or the browser's Web Speech API). The app never records, stores, or
 * uploads raw audio. Only the recognized transcript is used — for instant
 * feedback — then discarded.
 *
 * Matching is client-side: Arabic normalization (strip diacritics,
 * unify alef/ya/ta-marbuta) + letter-level Levenshtein similarity.
 */

import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeSpeechRecognition } from "@capacitor-community/speech-recognition";
import { MIN_CONFIDENCE, PASS_SCORE, SPEECH_LANG } from "./teacher-config";

// ── Arabic normalization ──────────────────────────────────────────────────────

/** Strip harakat/tanween/superscript alef & tatweel; unify letter variants. */
export function normalizeArabic(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g, "") // diacritics, dagger alef, tatweel, Quranic marks
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  const curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = [...curr];
  }
  return prev[n];
}

/** 0–100 similarity between two normalized Arabic strings. */
export function arabicSimilarity(expected: string, actual: string): number {
  const e = normalizeArabic(expected);
  const a = normalizeArabic(actual);
  if (!e.length) return 0;
  if (e === a) return 100;
  const dist = levenshtein(e, a);
  const maxLen = Math.max(e.length, a.length);
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

/** Letters of `expected` missing from `actual`, and extra letters said. */
export function letterDiff(expected: string, actual: string): { missing: string[]; extra: string[] } {
  const e = normalizeArabic(expected).replace(/\s/g, "").split("");
  const a = normalizeArabic(actual).replace(/\s/g, "").split("");
  const aCount = new Map<string, number>();
  a.forEach((ch) => aCount.set(ch, (aCount.get(ch) ?? 0) + 1));
  const missing: string[] = [];
  e.forEach((ch) => {
    const c = aCount.get(ch) ?? 0;
    if (c > 0) aCount.set(ch, c - 1);
    else if (!missing.includes(ch)) missing.push(ch);
  });
  const eSet = new Set(e);
  const extra = [...new Set(a.filter((ch) => !eSet.has(ch)))];
  return { missing, extra };
}

// ── Assessment result ─────────────────────────────────────────────────────────

export type Verdict = "pass" | "retry" | "unclear";

export interface Assessment {
  verdict: Verdict;
  /** Best word-match percentage 0–100. */
  matchScore: number;
  /** Recognizer confidence 0–1 (best alternative), -1 if not reported. */
  confidence: number;
  missing: string[];
  extra: string[];
  /** Best transcript heard (normalized display form). */
  heard: string;
}

/** Score every recognizer alternative against the expected word; keep the best. */
export function assess(expected: string, alternatives: string[], confidence = -1): Assessment {
  let best = { score: 0, heard: "" };
  for (const alt of alternatives) {
    // The recognizer may return a phrase — also try each token.
    const candidates = [alt, ...alt.split(/\s+/)];
    for (const c of candidates) {
      const score = arabicSimilarity(expected, c);
      if (score > best.score) best = { score, heard: c };
    }
  }

  const { missing, extra } = letterDiff(expected, best.heard || "");

  if (best.score >= PASS_SCORE) {
    return { verdict: "pass", matchScore: best.score, confidence, missing, extra, heard: best.heard };
  }
  // Nothing intelligible or very low confidence → don't mark wrong.
  if (!alternatives.length || (confidence >= 0 && confidence < MIN_CONFIDENCE) || best.score < 20) {
    return { verdict: "unclear", matchScore: best.score, confidence, missing, extra, heard: best.heard };
  }
  return { verdict: "retry", matchScore: best.score, confidence, missing, extra, heard: best.heard };
}

// ── Recognizer abstraction ────────────────────────────────────────────────────

export type SpeechSupport = "native" | "web" | "none";

interface SpeechRecognitionPlugin {
  available(): Promise<{ available: boolean }>;
  checkPermissions(): Promise<{ speechRecognition: string }>;
  requestPermissions(): Promise<{ speechRecognition: string }>;
  start(options: {
    language?: string;
    maxResults?: number;
    partialResults?: boolean;
    popup?: boolean;
  }): Promise<{ matches?: string[] }>;
  stop(): Promise<void>;
}

/**
 * Statically imported (bundled into the main chunk) so it can NEVER fail to
 * load at runtime inside the Android WebView. A previous dynamic
 * `import(...)` could fail on-device and the failure was cached, which made
 * the whole Teacher flow silently fall back to listen-only mode.
 */
async function getNativePlugin(): Promise<SpeechRecognitionPlugin | null> {
  if (!Capacitor.isNativePlatform()) return null;
  return NativeSpeechRecognition as unknown as SpeechRecognitionPlugin;
}

type WebSpeechRecognition = {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

function getWebRecognizerCtor(): (new () => WebSpeechRecognition) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => WebSpeechRecognition)
    | null;
}

/**
 * What recognition path is available on this device?
 * On native Android we ALWAYS report "native" when the plugin is present —
 * the OS "recognizer availability" pre-check can report false negatives on
 * some devices, which would hide the mic button entirely. Real failures are
 * surfaced at listen time instead.
 */
export async function getSpeechSupport(): Promise<SpeechSupport> {
  const native = await getNativePlugin();
  if (native) return "native";
  if (getWebRecognizerCtor()) return "web";
  return "none";
}

/**
 * Debug helper: human-readable reason WHY speech support resolved the way it
 * did. Shown in the listen-only panel so on-device fallbacks are never silent.
 */
export function getSpeechSupportReason(): string {
  if (Capacitor.isNativePlatform()) {
    return "native platform — Android SpeechRecognizer plugin (statically bundled)";
  }
  if (getWebRecognizerCtor()) {
    return "browser — Web Speech API available";
  }
  return "not a native app build AND this browser has no Web Speech API (SpeechRecognition/webkitSpeechRecognition missing)";
}

/** Open this app's Android settings page (for re-granting a denied mic permission). */
export async function openAppSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import("capacitor-native-settings");
    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App,
    });
    return true;
  } catch {
    return false;
  }
}

export type PermissionState = "granted" | "denied" | "prompt";

/** Check mic/speech permission WITHOUT prompting (native only; web reports "prompt"). */
export async function checkSpeechPermission(): Promise<PermissionState> {
  const native = await getNativePlugin();
  if (!native) return "prompt";
  try {
    const { speechRecognition } = await native.checkPermissions();
    if (speechRecognition === "granted") return "granted";
    if (speechRecognition === "denied") return "denied";
    return "prompt";
  } catch {
    return "prompt";
  }
}

/** Request mic/speech permission (shows the OS dialog). */
export async function requestSpeechPermission(): Promise<PermissionState> {
  const native = await getNativePlugin();
  if (!native) return "prompt"; // web: permission is requested implicitly by start()
  try {
    const { speechRecognition } = await native.requestPermissions();
    if (speechRecognition === "granted") return "granted";
    if (speechRecognition === "denied") return "denied";
    return "prompt";
  } catch {
    return "denied";
  }
}

export interface ListenResult {
  alternatives: string[];
  confidence: number; // -1 when the engine doesn't report it
  error?: "no-speech" | "not-allowed" | "network" | "aborted" | "unknown";
}

let _webActive: WebSpeechRecognition | null = null;
let _nativeActive = false;

/**
 * Listen once and return recognized alternatives.
 * Resolves (never rejects) — errors come back in `error`.
 */
export async function listenOnce(timeoutMs: number): Promise<ListenResult> {
  const native = await getNativePlugin();
  if (native) {
    _nativeActive = true;
    try {
      const timer = new Promise<{ matches?: string[] }>((resolve) =>
        setTimeout(() => {
          native.stop().catch(() => {});
          resolve({ matches: [] });
        }, timeoutMs),
      );
      const res = await Promise.race([
        native.start({ language: SPEECH_LANG, maxResults: 5, partialResults: false, popup: false }),
        timer,
      ]);
      const matches = res?.matches ?? [];
      return { alternatives: matches, confidence: -1, error: matches.length ? undefined : "no-speech" };
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "").toLowerCase();
      if (msg.includes("permission") || msg.includes("denied")) {
        return { alternatives: [], confidence: -1, error: "not-allowed" };
      }
      if (msg.includes("network")) return { alternatives: [], confidence: -1, error: "network" };
      return { alternatives: [], confidence: -1, error: "unknown" };
    } finally {
      _nativeActive = false;
    }
  }

  // Web Speech API fallback
  const Ctor = getWebRecognizerCtor();
  if (!Ctor) return { alternatives: [], confidence: -1, error: "unknown" };

  return new Promise<ListenResult>((resolve) => {
    const rec = new Ctor();
    _webActive = rec;
    let settled = false;
    const done = (r: ListenResult) => {
      if (settled) return;
      settled = true;
      _webActive = null;
      clearTimeout(timer);
      resolve(r);
    };
    const timer = setTimeout(() => {
      try { rec.stop(); } catch { /* ignore */ }
      // onresult/onend may still fire; if not, resolve as no-speech shortly after
      setTimeout(() => done({ alternatives: [], confidence: -1, error: "no-speech" }), 800);
    }, timeoutMs);

    rec.lang = SPEECH_LANG;
    rec.maxAlternatives = 5;
    rec.interimResults = false;
    rec.continuous = false;

    rec.onresult = (e) => {
      const first = e.results[0];
      const alts: string[] = [];
      let conf = -1;
      for (let i = 0; i < first.length; i++) {
        alts.push(first[i].transcript);
        if (i === 0 && typeof first[i].confidence === "number") conf = first[i].confidence;
      }
      done({ alternatives: alts, confidence: conf });
    };
    rec.onerror = (e) => {
      const map: Record<string, ListenResult["error"]> = {
        "no-speech": "no-speech",
        "not-allowed": "not-allowed",
        "service-not-allowed": "not-allowed",
        network: "network",
        aborted: "aborted",
      };
      done({ alternatives: [], confidence: -1, error: map[e.error] ?? "unknown" });
    };
    rec.onend = () => done({ alternatives: [], confidence: -1, error: "no-speech" });

    try {
      rec.start();
    } catch {
      done({ alternatives: [], confidence: -1, error: "unknown" });
    }
  });
}

/** Stop any in-flight recognition (user released the mic button). */
export async function stopListening(): Promise<void> {
  if (_webActive) {
    try { _webActive.stop(); } catch { /* ignore */ }
  }
  if (_nativeActive) {
    const native = await getNativePlugin();
    try { await native?.stop(); } catch { /* ignore */ }
  }
}
