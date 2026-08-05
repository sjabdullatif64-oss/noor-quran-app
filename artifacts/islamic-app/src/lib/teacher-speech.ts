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
import {
  SpeechRecognition as NativeSpeechRecognition,
  type SpeechRecognitionPlugin,
} from "@capacitor-community/speech-recognition";
import { MIN_CONFIDENCE, PASS_SCORE, SPEECH_LANG } from "./teacher-config";
import { teacherDiag } from "./teacher-touch-diagnostics";

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

/**
 * Statically imported (bundled into the main chunk) so it can NEVER fail to
 * load at runtime inside the Android WebView. A previous dynamic
 * `import(...)` could fail on-device and the failure was cached, which made
 * the whole Teacher flow silently fall back to listen-only mode.
 */
function getNativePlugin(): SpeechRecognitionPlugin | null {
  const isNative = Capacitor.isNativePlatform();
  teacherDiag("Speech getNativePlugin", { isNative });
  if (!isNative) {
    teacherDiag("Speech getNativePlugin return: web/null");
    return null;
  }
  const plugin = NativeSpeechRecognition as unknown as SpeechRecognitionPlugin;
  teacherDiag("Speech getNativePlugin return: native", { plugin: plugin ? "PRESENT" : "MISSING" });
  return plugin;
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
 *
 * `onStep` is an optional diagnostic callback: when provided, every
 * sub-step inside this function posts a short status string so callers can
 * display them directly on-screen without needing adb/chrome://inspect.
 */
export async function getSpeechSupport(
  onStep?: (msg: string) => void,
): Promise<SpeechSupport> {
  // ── Sub-step 1.1 ─────────────────────────────────────────────────────────
  onStep?.("Step 1.1 — Capacitor.isNativePlatform()");
  const isNative = Capacitor.isNativePlatform();
  onStep?.("Step 1.1 ✓  isNativePlatform = " + isNative);

  if (!isNative) {
    // ── Sub-step 1.2 (web path) ─────────────────────────────────────────────
    onStep?.("Step 1.2 — window.SpeechRecognition / webkitSpeechRecognition");
    const webCtor = getWebRecognizerCtor();
    onStep?.("Step 1.2 ✓  webSpeechAPI = " + (webCtor ? "available" : "missing"));
    return webCtor ? "web" : "none";
  }

  // ── Sub-step 1.2 (native path) ──────────────────────────────────────────
  onStep?.("Step 1.2 — window.Capacitor.Plugins lookup");
  type CapWin = { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> } };
  const capObj = (window as unknown as CapWin).Capacitor;
  const pluginsObj = capObj?.Plugins;
  const pluginKeys = pluginsObj ? Object.keys(pluginsObj) : [];
  onStep?.(
    "Step 1.2 ✓  Plugins: " + pluginKeys.length + " registered\n" +
    "[" + pluginKeys.join(", ") + "]"
  );

  // ── Sub-step 1.3 ─────────────────────────────────────────────────────────
  onStep?.("Step 1.3 — Plugins[\"SpeechRecognition\"] direct lookup");
  const directPlugin = pluginsObj?.["SpeechRecognition"];
  onStep?.("Step 1.3 ✓  SpeechRecognition = " + (directPlugin ? "FOUND in Plugins" : "NOT FOUND in Plugins"));

  // ── Sub-step 1.4 ─────────────────────────────────────────────────────────
  onStep?.("Step 1.4 — accessing NativeSpeechRecognition (static import ref)");
  const pluginRef = NativeSpeechRecognition as unknown as SpeechRecognitionPlugin;
  onStep?.("Step 1.4 ✓  ref = " + (pluginRef ? "PRESENT" : "null / undefined"));

  // ── Sub-step 1.5 ─────────────────────────────────────────────────────────
  onStep?.("Step 1.5 — returning \"native\"");
  return "native";
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

/** Race a promise against a timeout; resolves to `fallback` if the promise
 *  doesn't settle within `ms` milliseconds. Never rejects. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timer = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      teacherDiag(`Speech ${label} timeout`, { ms, fallback: JSON.stringify(fallback) }, "warn");
      resolve(fallback);
    }, ms);
  });
  return Promise.race([promise, timer]).finally(() => clearTimeout(timeoutId));
}

/** Check mic/speech permission WITHOUT prompting (native only; web reports "prompt"). */
export async function checkSpeechPermission(): Promise<PermissionState> {
  teacherDiag("Speech checkSpeechPermission start");
  const native = getNativePlugin();
  if (!native) {
    teacherDiag("Speech checkSpeechPermission return: no native plugin/prompt");
    return "prompt";
  }
  try {
    teacherDiag("Speech BEFORE native.checkPermissions");
    const { speechRecognition } = await withTimeout(
      native.checkPermissions(),
      2000,
      { speechRecognition: "prompt" },
      "native.checkPermissions()"
    );
    teacherDiag("Speech AFTER native.checkPermissions", { speechRecognition });
    if (speechRecognition === "granted") return "granted";
    if (speechRecognition === "denied") return "denied";
    return "prompt";
  } catch (e) {
    teacherDiag("Speech native.checkPermissions rejected", { error: String(e) }, "error");
    return "prompt";
  }
}

/** Request mic/speech permission (shows the OS dialog). */
export async function requestSpeechPermission(): Promise<PermissionState> {
  teacherDiag("Speech requestSpeechPermission start");
  const native = getNativePlugin();
  if (!native) {
    teacherDiag("Speech requestSpeechPermission return: no native plugin/prompt");
    return "prompt"; // web: permission is requested implicitly by start()
  }
  try {
    teacherDiag("Speech BEFORE native.requestPermissions");
    const { speechRecognition } = await withTimeout(
      native.requestPermissions(),
      8000,
      { speechRecognition: "prompt" },
      "native.requestPermissions()"
    );
    teacherDiag("Speech AFTER native.requestPermissions", { speechRecognition });
    if (speechRecognition === "granted") return "granted";
    if (speechRecognition === "denied") return "denied";
    return "prompt";
  } catch (e) {
    teacherDiag("Speech native.requestPermissions rejected", { error: String(e) }, "error");
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
  teacherDiag("Speech listenOnce start", { timeoutMs });
  const native = getNativePlugin();
  if (native) {
    teacherDiag("Speech listenOnce native path");
    _nativeActive = true;
    try {
      const timer = new Promise<{ matches?: string[] }>((resolve) =>
        setTimeout(() => {
          teacherDiag("Speech listenOnce timer fired; calling native.stop", { timeoutMs });
          native.stop().catch(() => {});
          resolve({ matches: [] });
        }, timeoutMs),
      );
      teacherDiag("Speech BEFORE native.start", { language: SPEECH_LANG, maxResults: 5, partialResults: false, popup: false });
      const res = await Promise.race([
        native.start({ language: SPEECH_LANG, maxResults: 5, partialResults: false, popup: false }),
        timer,
      ]);
      teacherDiag("Speech AFTER native.start/race", { matches: res?.matches?.length ?? 0 });
      const matches = res?.matches ?? [];
      return { alternatives: matches, confidence: -1, error: matches.length ? undefined : "no-speech" };
    } catch (e) {
      teacherDiag("Speech native.start rejected/threw", { error: String(e) }, "error");
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
  if (!Ctor) {
    teacherDiag("Speech listenOnce return: Web Speech constructor missing");
    return { alternatives: [], confidence: -1, error: "unknown" };
  }

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
      teacherDiag("Speech WebSpeechRecognition calling rec.start");
      rec.start();
      teacherDiag("Speech WebSpeechRecognition rec.start returned");
    } catch (error) {
      teacherDiag("Speech WebSpeechRecognition rec.start threw", { error: String(error) }, "error");
      done({ alternatives: [], confidence: -1, error: "unknown" });
    }
  });
}

/** Stop any in-flight recognition (user released the mic button). */
export async function stopListening(): Promise<void> {
  teacherDiag("Speech stopListening start", {
    webActive: Boolean(_webActive),
    nativeActive: _nativeActive,
  });
  if (_webActive) {
    try {
      _webActive.stop();
      teacherDiag("Speech WebSpeechRecognition stop returned");
    } catch (error) {
      teacherDiag("Speech WebSpeechRecognition stop threw", { error: String(error) }, "error");
    }
  }
  if (_nativeActive) {
    const native = getNativePlugin();
    try {
      await native?.stop();
      teacherDiag("Speech native.stop returned");
    } catch (error) {
      teacherDiag("Speech native.stop threw", { error: String(error) }, "error");
    }
  }
}
