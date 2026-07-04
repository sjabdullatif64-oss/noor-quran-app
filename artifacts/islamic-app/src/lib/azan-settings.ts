// Azan notification settings — persisted in localStorage

import type { AzanSound } from "./azan-plugin";

const STORAGE_KEY = "noor-azan-settings";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AzanPrayerToggles {
  fajr:    boolean;
  dhuhr:   boolean;
  asr:     boolean;
  maghrib: boolean;
  isha:    boolean;
}

export interface AzanSettings {
  enabled:  boolean;
  prayers:  AzanPrayerToggles;
  sound:    AzanSound;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_AZAN_SETTINGS: AzanSettings = {
  enabled: false,
  prayers: {
    fajr:    true,
    dhuhr:   true,
    asr:     true,
    maghrib: true,
    isha:    true,
  },
  sound: "default",
};

// ── Storage ───────────────────────────────────────────────────────────────────

export function getAzanSettings(): AzanSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AZAN_SETTINGS, prayers: { ...DEFAULT_AZAN_SETTINGS.prayers } };
    const parsed = JSON.parse(raw) as Partial<AzanSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_AZAN_SETTINGS.enabled,
      prayers: { ...DEFAULT_AZAN_SETTINGS.prayers, ...(parsed.prayers ?? {}) },
      sound:   parsed.sound   ?? DEFAULT_AZAN_SETTINGS.sound,
    };
  } catch {
    return { ...DEFAULT_AZAN_SETTINGS, prayers: { ...DEFAULT_AZAN_SETTINGS.prayers } };
  }
}

export function saveAzanSettings(s: AzanSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ── Sound metadata ────────────────────────────────────────────────────────────

export const AZAN_SOUND_OPTIONS: { value: AzanSound; label: string; sublabel: string }[] = [
  { value: "default",  label: "Default Adhan",    sublabel: "Traditional call to prayer (public domain)" },
  { value: "makkah",   label: "Makkah Azan",      sublabel: "Grand Mosque — Masjid al-Haram, Makkah" },
  { value: "madinah",  label: "Traditional Azan", sublabel: "Classic call to prayer (CC BY-SA)" },
  { value: "mishary",  label: "Community Azan",   sublabel: "Reciter: Aaqib Azeez (CC BY-SA)" },
];

// ── Prayer metadata ───────────────────────────────────────────────────────────

export const AZAN_PRAYER_DEFS: {
  key:      keyof AzanPrayerToggles;
  label:    string;
  sublabel: string;
  emoji:    string;
}[] = [
  { key: "fajr",    label: "Fajr",    sublabel: "Dawn prayer",      emoji: "🌙" },
  { key: "dhuhr",   label: "Dhuhr",   sublabel: "Midday prayer",    emoji: "☀️" },
  { key: "asr",     label: "Asr",     sublabel: "Afternoon prayer", emoji: "🌤️" },
  { key: "maghrib", label: "Maghrib", sublabel: "Sunset prayer",    emoji: "🌅" },
  { key: "isha",    label: "Isha",    sublabel: "Night prayer",     emoji: "🌙" },
];
