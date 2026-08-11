import { useSyncExternalStore } from "react";
import { localizeDivineName } from "./divine-name-localization";
import type { TranslationLanguage } from "./api";

// ── Storage keys ──────────────────────────────────────────────────────────────
const EXPLANATORY_KEY = "noor-show-explanatory";
const TRANSLITERATION_KEY = "noor-show-transliteration";
const TRANSLATION_KEY = "noor-show-translation";

// ── Tiny pub/sub so both readers + the menu re-render instantly on change ─────
type Listener = () => void;
let listeners: Listener[] = [];

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeAyahDisplay(fn: Listener): () => void {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

// ── Show / Hide explanatory (bracketed) words in translation ──────────────────
// Default = show, to keep the original translation style unchanged out of the box.
export function getShowExplanatory(): boolean {
  const raw = localStorage.getItem(EXPLANATORY_KEY);
  return raw === null ? true : raw === "1";
}

export function setShowExplanatory(show: boolean): void {
  localStorage.setItem(EXPLANATORY_KEY, show ? "1" : "0");
  emit();
}

function getBooleanSetting(key: string, fallback = true): boolean {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : raw === "1";
}

export function getShowTransliteration(): boolean {
  return getBooleanSetting(TRANSLITERATION_KEY);
}

export function setShowTransliteration(show: boolean): void {
  localStorage.setItem(TRANSLITERATION_KEY, show ? "1" : "0");
  emit();
}

export function getShowTranslation(): boolean {
  return getBooleanSetting(TRANSLATION_KEY);
}

export function setShowTranslation(show: boolean): void {
  localStorage.setItem(TRANSLATION_KEY, show ? "1" : "0");
  emit();
}

/**
 * Strip parenthetical explanatory insertions (e.g. Urdu jalandhry-style
 * "(اپنے مقدمات)" asides) from translation text. Display-layer only —
 * never call this against stored/source data, only at render time, so
 * audio (TTS) playback and saved bookmarks/favorites keep the original text.
 */
export function stripExplanatory(text: string): string {
  if (!text) return text;
  return text.replace(/\s*\([^()]*\)/g, "").replace(/\s{2,}/g, " ").trim();
}

/** Apply the current show/hide-explanatory-words setting to translation text
 *  for display purposes (WYSIWYG — use this output for Share/Copy too). */
export function applyExplanatorySetting(text: string): string {
  return getShowExplanatory() ? text : stripExplanatory(text);
}

/**
 * The single display boundary for Quran translation text.
 *
 * Translation data remains untouched in API responses, offline packs, query
 * caches, TTS input, and saved bookmarks/favorites. Only text that is about
 * to be shown or shared is normalized for the selected translation language.
 */
export function applyTranslationDisplay(
  language: TranslationLanguage,
  text: string,
): string {
  return applyExplanatorySetting(localizeDivineName(language, text));
}

// ── React hook — live-updates both readers when the menu changes a setting ────
// Note: text zoom is intentionally NOT part of this shared/persisted store —
// see `useAyahPinchZoom` (src/hooks/use-pinch-zoom.ts), which is local,
// in-memory-only state per reader page so it never persists and always
// resets to default when the reader/app is reopened.
export function useAyahDisplaySettings(): {
  showExplanatory: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
} {
  const showExplanatory = useSyncExternalStore(subscribeAyahDisplay, getShowExplanatory, getShowExplanatory);
  const showTransliteration = useSyncExternalStore(
    subscribeAyahDisplay,
    getShowTransliteration,
    getShowTransliteration,
  );
  const showTranslation = useSyncExternalStore(
    subscribeAyahDisplay,
    getShowTranslation,
    getShowTranslation,
  );
  return { showExplanatory, showTransliteration, showTranslation };
}
