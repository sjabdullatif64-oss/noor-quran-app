/**
 * Noor Quran — AI Quran Teacher: recitation assessment
 *
 * Privacy-first: audio is processed by the DEVICE's speech recognizer
 * (Android SpeechRecognizer via @capacitor-community/speech-recognition,
 * or the browser's Web Speech API). The app never records, stores, or
 * uploads raw audio. Only the recognized transcript is used — for instant
 * feedback — then discarded.
 *
 * Matching is client-side: Arabic normalization (strip diacritics and
 * punctuation, unify Arabic letter forms) + weighted letter-level
 * Levenshtein similarity. Long-vowel insertions/deletions are penalized,
 * but less than consonant errors because speech recognition commonly writes
 * short-vowel pronunciation differences as extra ا/و/ي letters.
 */

import { Capacitor } from "@capacitor/core";
import {
  SpeechRecognition as NativeSpeechRecognition,
  type SpeechRecognitionPlugin,
} from "@capacitor-community/speech-recognition";
import type { PluginListenerHandle } from "@capacitor/core";
import {
  PASS_SCORE,
  RECOGNITION_RETRY_DELAY_MS,
  SPEECH_LANG,
} from "./teacher-config";

// ── Arabic normalization ──────────────────────────────────────────────────────

const LONG_VOWELS = new Set(["ا", "و", "ي"]);

/**
 * Strip Arabic marks/tatweel/punctuation and unify letter variants.
 *
 * NFKC handles Arabic presentation forms. NFD + \p{M} removes harakat,
 * tanween, Quranic annotation marks, and decomposed hamza/maddah marks.
 * Hamza carriers are mapped to their underlying pronunciation letters so
 * expected Quran text and speech-recognizer output use the same alphabet.
 */
export function normalizeArabic(s: string): string {
  return s
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/\u0640/g, "")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/[أإآٱء]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/[ةۀە]/g, "ه")
    .replace(/[\u200C\u200D]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const RECOGNIZER_PLACEHOLDER =
  /^(?:didn['’]?t understand|couldn['’]?t understand|could not understand|no speech|no match|لم أفهم(?:ك)?)$/i;

export type SpeechInputStatus =
  | "recognized"
  | "silence"
  | "timeout"
  | "recognition-failure";

/** Android can return a localized placeholder instead of an empty match list. */
export function isUsableTranscript(transcript: string): boolean {
  const value = transcript.trim().replace(/\s+/g, " ");
  return value.length > 0 && !RECOGNIZER_PLACEHOLDER.test(value);
}

export function statusForAlternatives(alternatives: string[]): SpeechInputStatus {
  return alternatives.some(isUsableTranscript) ? "recognized" : "silence";
}

export type EditOperationCounts = {
  insertions: number;
  deletions: number;
  substitutions: number;
};

export interface ArabicSimilarityDetails {
  normalizedExpected: string;
  normalizedActual: string;
  distance: number;
  maxLength: number;
  score: number;
  operations: EditOperationCounts;
}

type EditCell = {
  cost: number;
  operations: EditOperationCounts;
};

function operationTotal(operations: EditOperationCounts): number {
  return operations.insertions + operations.deletions + operations.substitutions;
}

function betterEditCell(candidate: EditCell, current: EditCell | undefined): EditCell {
  if (!current || candidate.cost < current.cost) return candidate;
  if (candidate.cost > current.cost) return current;
  return operationTotal(candidate.operations) < operationTotal(current.operations) ? candidate : current;
}

function addOperation(
  base: EditCell,
  operation: keyof EditOperationCounts,
  cost: number,
): EditCell {
  return {
    cost: base.cost + cost,
    operations: {
      ...base.operations,
      [operation]: base.operations[operation] + 1,
    },
  };
}

/**
 * Weighted edit distance. Long-vowel insertions/deletions still lower the
 * score, but cost 0.5 instead of 1.0. Substitutions and consonant edits keep
 * full cost, preventing a wrong consonant from looking like a close match.
 */
function weightedEditDistance(a: string, b: string): EditCell {
  const rows: EditCell[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => ({
      cost: 0,
      operations: { insertions: 0, deletions: 0, substitutions: 0 },
    })),
  );

  for (let i = 1; i <= a.length; i++) {
    rows[i][0] = addOperation(rows[i - 1][0], "deletions", LONG_VOWELS.has(a[i - 1]) ? 0.5 : 1);
  }
  for (let j = 1; j <= b.length; j++) {
    rows[0][j] = addOperation(rows[0][j - 1], "insertions", LONG_VOWELS.has(b[j - 1]) ? 0.5 : 1);
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const expectedChar = a[i - 1];
      const actualChar = b[j - 1];
      let best =
        expectedChar === actualChar
          ? rows[i - 1][j - 1]
          : addOperation(rows[i - 1][j - 1], "substitutions", 1);
      best = betterEditCell(
        addOperation(rows[i - 1][j], "deletions", LONG_VOWELS.has(expectedChar) ? 0.5 : 1),
        best,
      );
      best = betterEditCell(
        addOperation(rows[i][j - 1], "insertions", LONG_VOWELS.has(actualChar) ? 0.5 : 1),
        best,
      );
      rows[i][j] = best;
    }
  }
  return rows[a.length][b.length];
}

export function arabicSimilarityDetails(expected: string, actual: string): ArabicSimilarityDetails {
  const normalizedExpected = normalizeArabic(expected);
  const normalizedActual = normalizeArabic(actual);
  const maxLength = Math.max(normalizedExpected.length, normalizedActual.length);
  if (!normalizedExpected.length) {
    return {
      normalizedExpected,
      normalizedActual,
      distance: normalizedActual.length,
      maxLength: normalizedActual.length,
      score: 0,
      operations: {
        insertions: normalizedActual.length,
        deletions: 0,
        substitutions: 0,
      },
    };
  }

  const result = weightedEditDistance(normalizedExpected, normalizedActual);
  return {
    normalizedExpected,
    normalizedActual,
    distance: result.cost,
    maxLength,
    score: Math.max(0, Math.round((1 - result.cost / maxLength) * 100)),
    operations: result.operations,
  };
}

/** 0–100 similarity between two Arabic strings after normalization. */
export function arabicSimilarity(expected: string, actual: string): number {
  return arabicSimilarityDetails(expected, actual).score;
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
  /** Whether the recognizer produced speech, timed out, or failed. */
  inputStatus: SpeechInputStatus;
  missing: string[];
  extra: string[];
  /** Best transcript heard (normalized display form). */
  heard: string;
}

/** Score every usable recognizer alternative against the expected word; keep the best. */
export function assess(
  expected: string,
  alternatives: string[],
  confidence = -1,
  inputStatus = statusForAlternatives(alternatives),
): Assessment {
  let best = { score: 0, heard: "" };
  const expectedWordCount = normalizeArabic(expected).split(/\s+/).filter(Boolean).length;

  for (const alt of alternatives) {
    if (!isUsableTranscript(alt)) continue;
    // Single-word lessons retain the original tolerant behavior. Progressive
    // passages must be assessed as a complete phrase; accepting an individual
    // token would let a learner pass a 3–10 word lesson after saying one word.
    const candidates = expectedWordCount > 1
      ? [alt]
      : [alt, ...alt.split(/\s+/).filter(Boolean)];
    candidates.forEach((c, index) => {
      const details = arabicSimilarityDetails(expected, c);
      if (details.score > best.score) best = { score: details.score, heard: c };
    });
  }

  const { missing, extra } = letterDiff(expected, best.heard || "");

  if (best.score >= PASS_SCORE) {
    return {
      verdict: "pass",
      matchScore: best.score,
      confidence,
      inputStatus,
      missing,
      extra,
      heard: best.heard,
    };
  }
  // Only a missing/failed recognizer result is unclear. If the recognizer
  // produced usable speech, show the normal retry feedback even when the
  // word match is poor: background noise and accent differences can lower
  // confidence without meaning that nothing was understood.
  if (inputStatus !== "recognized") {
    return {
      verdict: "unclear",
      matchScore: best.score,
      confidence,
      inputStatus,
      missing,
      extra,
      heard: best.heard,
    };
  }
  return {
    verdict: "retry",
    matchScore: best.score,
    confidence,
    inputStatus,
    missing,
    extra,
    heard: best.heard,
  };
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
  if (!isNative) {
    return null;
  }
  const plugin = NativeSpeechRecognition as unknown as SpeechRecognitionPlugin;
  return plugin;
}

type WebSpeechRecognition = {
  lang: string;
  maxAlternatives: number;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: {
    results: ArrayLike<WebSpeechResult>;
  }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type WebSpeechResult = ArrayLike<{
  transcript: string;
  confidence: number;
}> & {
  isFinal?: boolean;
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
      resolve(fallback);
    }, ms);
  });
  return Promise.race([promise, timer]).finally(() => clearTimeout(timeoutId));
}

/** Check mic/speech permission WITHOUT prompting (native only; web reports "prompt"). */
export async function checkSpeechPermission(): Promise<PermissionState> {
  const native = getNativePlugin();
  if (!native) {
    return "prompt";
  }
  try {
    const { speechRecognition } = await withTimeout(
      native.checkPermissions(),
      2000,
      { speechRecognition: "prompt" },
      "native.checkPermissions()"
    );
    if (speechRecognition === "granted") return "granted";
    if (speechRecognition === "denied") return "denied";
    return "prompt";
  } catch (e) {
    return "prompt";
  }
}

/** Request mic/speech permission (shows the OS dialog). */
export async function requestSpeechPermission(): Promise<PermissionState> {
  const native = getNativePlugin();
  if (!native) {
    return "prompt"; // web: permission is requested implicitly by start()
  }
  try {
    const { speechRecognition } = await withTimeout(
      native.requestPermissions(),
      8000,
      { speechRecognition: "prompt" },
      "native.requestPermissions()"
    );
    if (speechRecognition === "granted") return "granted";
    if (speechRecognition === "denied") return "denied";
    return "prompt";
  } catch (e) {
    return "denied";
  }
}

export interface ListenResult {
  alternatives: string[];
  confidence: number; // -1 when the engine doesn't report it
  status: SpeechInputStatus;
  error?: "no-speech" | "timeout" | "not-allowed" | "network" | "aborted" | "unknown";
  errors?: string[];
  attempts?: number;
}

let _webActive: WebSpeechRecognition | null = null;
let _nativeActive = false;

/**
 * Listen once and return recognized alternatives.
 * Resolves (never rejects) — errors come back in `error`.
 */
export async function listenOnce(timeoutMs: number): Promise<ListenResult> {
  const native = getNativePlugin();
  if (native) {
    _nativeActive = true;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let partialHandle: PluginListenerHandle | undefined;
    let listeningHandle: PluginListenerHandle | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const collectedMatches: string[] = [];

    const addMatches = (matches: string[] | undefined) => {
      for (const match of matches ?? []) {
        if (match && !collectedMatches.includes(match)) collectedMatches.push(match);
      }
    };

    const cleanup = async () => {
      await Promise.all([
        partialHandle?.remove().catch(() => {}),
        listeningHandle?.remove().catch(() => {}),
      ]);
      partialHandle = undefined;
      listeningHandle = undefined;
    };

    const finish = async (
      resolve: (result: ListenResult) => void,
      result: ListenResult,
    ) => {
      if (settled) return;
      settled = true;
      if (timerId) clearTimeout(timerId);
      if (settleTimer) clearTimeout(settleTimer);
      await cleanup();
      resolve(result);
    };

    try {
      return await new Promise<ListenResult>((resolve) => {
        const resolveNative = (result: ListenResult) => {
          finish(resolve, result).catch(() => resolve(result));
        };
        const handleNativeError = (error: unknown) => {
          const msg = String((error as { message?: string })?.message ?? error).toLowerCase();
          if (msg.includes("permission") || msg.includes("denied")) {
            resolveNative({ alternatives: collectedMatches, confidence: -1, status: "recognition-failure", error: "not-allowed" });
          } else if (msg.includes("network")) {
            resolveNative({ alternatives: collectedMatches, confidence: -1, status: "recognition-failure", error: "network" });
          } else if (msg.includes("no speech") || msg.includes("no match") || msg.includes("timeout")) {
            resolveNative({ alternatives: collectedMatches, confidence: -1, status: "silence", error: "no-speech" });
          } else {
            resolveNative({ alternatives: collectedMatches, confidence: -1, status: "recognition-failure", error: "unknown" });
          }
        };

        const finishAfterNativeStop = () => {
          // Android emits listeningState("stopped") at end-of-speech and can
          // deliver its last partial/final result a moment later.
          settleTimer = setTimeout(() => {
            const recognized = statusForAlternatives(collectedMatches) === "recognized";
            resolveNative({
              alternatives: collectedMatches,
              confidence: -1,
              status: recognized ? "recognized" : "silence",
              error: recognized ? undefined : "no-speech",
            });
          }, 300);
        };

        const setupAndStart = async () => {
          partialHandle = await native.addListener("partialResults", ({ matches }) => {
            addMatches(matches);
          });
          listeningHandle = await native.addListener("listeningState", ({ status }) => {
            if (status === "stopped") finishAfterNativeStop();
          });

          timerId = setTimeout(() => {
            native.stop().catch(() => {});
            settleTimer = setTimeout(() => {
              const recognized = statusForAlternatives(collectedMatches) === "recognized";
              resolveNative({
                alternatives: collectedMatches,
                confidence: -1,
                status: recognized ? "recognized" : "timeout",
                error: recognized ? undefined : "timeout",
              });
            }, 350);
          }, timeoutMs);

          // Partial results let us retain useful speech even when Android's
          // final callback is delayed or ends early around background noise.
          await native.start({
            language: SPEECH_LANG,
            maxResults: 5,
            partialResults: true,
            popup: false,
          });
        };

        setupAndStart().catch(handleNativeError);
      });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? "").toLowerCase();
      if (msg.includes("permission") || msg.includes("denied")) {
        return { alternatives: [], confidence: -1, status: "recognition-failure", error: "not-allowed" };
      }
      if (msg.includes("network")) {
        return { alternatives: [], confidence: -1, status: "recognition-failure", error: "network" };
      }
      if (msg.includes("no speech") || msg.includes("no match") || msg.includes("timeout")) {
        return { alternatives: [], confidence: -1, status: "silence", error: "no-speech" };
      }
      return { alternatives: [], confidence: -1, status: "recognition-failure", error: "unknown" };
    } finally {
      if (timerId) clearTimeout(timerId);
      _nativeActive = false;
    }
  }

  // Web Speech API fallback
  const Ctor = getWebRecognizerCtor();
  if (!Ctor) {
    return { alternatives: [], confidence: -1, status: "recognition-failure", error: "unknown" };
  }

  return new Promise<ListenResult>((resolve) => {
    const rec = new Ctor();
    _webActive = rec;
    let settled = false;
    let timedOut = false;
    let latestAlternatives: string[] = [];
    let latestConfidence = -1;
    const done = (r: ListenResult) => {
      if (settled) return;
      settled = true;
      _webActive = null;
      clearTimeout(timer);
      resolve(r);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      try { rec.stop(); } catch { /* ignore */ }
      // onresult/onend may still fire; if not, resolve as timeout shortly after.
      setTimeout(() => done({
        alternatives: latestAlternatives,
        confidence: latestConfidence,
        status: latestAlternatives.some(isUsableTranscript) ? "recognized" : "timeout",
        error: latestAlternatives.some(isUsableTranscript) ? undefined : "timeout",
      }), 800);
    }, timeoutMs);

    rec.lang = SPEECH_LANG;
    rec.maxAlternatives = 5;
    rec.interimResults = true;
    rec.continuous = true;

    rec.onresult = (e) => {
      const alts: string[] = [];
      let conf = -1;
      let finalResult = false;
      for (let resultIndex = 0; resultIndex < e.results.length; resultIndex++) {
        const speechResult = e.results[resultIndex];
        finalResult = finalResult || speechResult.isFinal === true;
        for (let i = 0; i < speechResult.length; i++) {
          alts.push(speechResult[i].transcript);
          if (resultIndex === e.results.length - 1 && i === 0 && typeof speechResult[i].confidence === "number") {
            conf = speechResult[i].confidence;
         }
      }
      }
       if (!alts.length) return;
      const status = statusForAlternatives(alts);
      if (status === "recognized") {
        // Keep the best usable interim transcript even if the browser ends
        // before it emits a final result.
        latestAlternatives = alts;
        latestConfidence = conf;
        if (finalResult) done({ alternatives: alts, confidence: conf, status, error: undefined });
      }
    };
    rec.onerror = (e) => {
      const map: Record<string, ListenResult["error"]> = {
        "no-speech": "no-speech",
        "not-allowed": "not-allowed",
        "service-not-allowed": "not-allowed",
        network: "network",
        aborted: "aborted",
      };
      const error = map[e.error] ?? "unknown";
      if (latestAlternatives.some(isUsableTranscript)) {
        done({ alternatives: latestAlternatives, confidence: latestConfidence, status: "recognized" });
      } else {
        done({
          alternatives: [],
          confidence: -1,
          status: error === "no-speech" ? "silence" : "recognition-failure",
          error,
        });
      }
    };
    rec.onend = () => {
       if (latestAlternatives.some(isUsableTranscript)) {
         done({
           alternatives: latestAlternatives,
           confidence: latestConfidence,
           status: "recognized",
         });
       } else if (timedOut) {
         done({ alternatives: [], confidence: -1, status: "timeout", error: "timeout" });
      } else {
        done({ alternatives: [], confidence: -1, status: "silence", error: "no-speech" });
      }
    };

    try {
      rec.start();
    } catch (error) {
      done({ alternatives: [], confidence: -1, status: "recognition-failure", error: "unknown" });
    }
  });
}

function isRetryableSpeechResult(result: ListenResult): boolean {
  return result.status === "silence" || result.status === "timeout";
}

/**
 * Give the recognizer one bounded second chance for transient no-speech
 * results. This avoids showing the unclear panel when Android ends the first
 * listening window early because of a pause or ordinary background noise.
 */
export async function listenWithRetries(
  timeoutMs: number,
  maxAttempts = 2,
  listen: (timeoutMs: number) => Promise<ListenResult> = listenOnce,
): Promise<ListenResult> {
  let latest: ListenResult = {
    alternatives: [],
    confidence: -1,
    status: "recognition-failure",
    error: "unknown",
    errors: ["recognition-not-started"],
    attempts: 0,
  };
  const errors: string[] = [];

  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
    const result = await listen(timeoutMs);
    latest = {
      ...result,
      attempts: attempt,
      errors: [...(result.errors ?? [])],
    };
    if (result.error) errors.push(result.error);

    if (!isRetryableSpeechResult(result) || result.alternatives.some(isUsableTranscript)) {
      return {
        ...latest,
        errors: [...new Set([...errors, ...(result.errors ?? [])])],
      };
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, RECOGNITION_RETRY_DELAY_MS));
    }
  }

  return {
    ...latest,
    errors: [...new Set([...errors, ...(latest.errors ?? [])])],
  };
}

/** Stop any in-flight recognition (user released the mic button). */
export async function stopListening(): Promise<void> {
  if (_webActive) {
    try {
      _webActive.stop();
    } catch {
    }
  }
  if (_nativeActive) {
    const native = getNativePlugin();
    try {
      await native?.stop();
    } catch {
    }
  }
}
