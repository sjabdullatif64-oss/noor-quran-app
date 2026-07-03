import { useSyncExternalStore } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const SCALE_KEY       = "noor-ayah-scale";
const EXPLANATORY_KEY = "noor-show-explanatory";

// ── Text zoom steps (100% = default) ───────────────────────────────────────────
export const TEXT_SCALE_STEPS = [0.85, 1, 1.15, 1.3, 1.45, 1.6];
const DEFAULT_SCALE = 1;

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

// ── Text scale (zoom) ──────────────────────────────────────────────────────────
export function getTextScale(): number {
  const raw = localStorage.getItem(SCALE_KEY);
  const n = raw ? parseFloat(raw) : NaN;
  return TEXT_SCALE_STEPS.includes(n) ? n : DEFAULT_SCALE;
}

export function setTextScale(scale: number): void {
  localStorage.setItem(SCALE_KEY, String(scale));
  emit();
}

export function increaseTextScale(): void {
  const cur = getTextScale();
  const idx = TEXT_SCALE_STEPS.indexOf(cur);
  setTextScale(TEXT_SCALE_STEPS[Math.min(idx + 1, TEXT_SCALE_STEPS.length - 1)]);
}

export function decreaseTextScale(): void {
  const cur = getTextScale();
  const idx = TEXT_SCALE_STEPS.indexOf(cur);
  setTextScale(TEXT_SCALE_STEPS[Math.max(idx - 1, 0)]);
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

// ── React hook — live-updates both readers when the menu changes a setting ────
export function useAyahDisplaySettings(): { scale: number; showExplanatory: boolean } {
  const scale = useSyncExternalStore(subscribeAyahDisplay, getTextScale, getTextScale);
  const showExplanatory = useSyncExternalStore(subscribeAyahDisplay, getShowExplanatory, getShowExplanatory);
  return { scale, showExplanatory };
}
