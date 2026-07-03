import { useSyncExternalStore } from "react";

// ── Storage keys ──────────────────────────────────────────────────────────────
const EXPLANATORY_KEY = "noor-show-explanatory";

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
// Note: text zoom is intentionally NOT part of this shared/persisted store —
// see `useAyahPinchZoom` (src/hooks/use-pinch-zoom.ts), which is local,
// in-memory-only state per reader page so it never persists and always
// resets to default when the reader/app is reopened.
export function useAyahDisplaySettings(): { showExplanatory: boolean } {
  const showExplanatory = useSyncExternalStore(subscribeAyahDisplay, getShowExplanatory, getShowExplanatory);
  return { showExplanatory };
}
