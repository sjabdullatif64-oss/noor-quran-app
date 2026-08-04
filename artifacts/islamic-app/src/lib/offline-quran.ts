import type { TranslationLanguage } from './api';

// ── Offline data types ─────────────────────────────────────────────────────────

export interface OfflineAyah {
  n: number;
  g: number;
  t: string;
}

export interface OfflineSurahData {
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  ayahs: OfflineAyah[];
}

export type OfflineArabicData = Record<string, OfflineSurahData>;
export type OfflineTranslData = Record<string, string[]>;

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

// ── Edition map — mirrors TRANSLATION_EDITIONS in api.ts, no circular import ──

const DOWNLOAD_EDITIONS: Partial<Record<TranslationLanguage, string>> = {
  english:    "en.sahih",
  sindhi:     "sd.amroti",
  hindi:      "hi.hindi",
  turkish:    "tr.ates",
  bengali:    "bn.bengali",
  indonesian: "id.indonesian",
  french:     "fr.hamidullah",
  spanish:    "es.asad",
  malay:      "ms.basmeih",
};

export const DOWNLOADABLE_TRANSLATIONS: TranslationLanguage[] = [
  "english", "sindhi", "hindi", "turkish", "bengali", "indonesian", "french", "spanish", "malay",
];

export const TRANSLATION_PACK_SIZE: Partial<Record<TranslationLanguage, string>> = {
  english:    "~1.4 MB",
  sindhi:     "~1.7 MB",
  hindi:      "~1.5 MB",
  turkish:    "~1.4 MB",
  bengali:    "~1.8 MB",
  indonesian: "~1.4 MB",
  french:     "~1.5 MB",
  spanish:    "~1.4 MB",
  malay:      "~1.4 MB",
};

// ── Bundled data loaders ───────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL;

async function loadJson<T>(filename: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}quran-data/${filename}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

let _arabicPromise:     Promise<OfflineArabicData | null> | null = null;
let _urduPromise:       Promise<OfflineTranslData  | null> | null = null;
let _translitPromise:   Promise<OfflineTranslData  | null> | null = null;
let _surahListPromise:  Promise<SurahMeta[]        | null> | null = null;

export function getOfflineArabic():    Promise<OfflineArabicData | null> {
  return (_arabicPromise   ??= loadJson<OfflineArabicData>("quran-arabic.json"));
}
export function getOfflineUrdu():      Promise<OfflineTranslData | null> {
  return (_urduPromise     ??= loadJson<OfflineTranslData>("quran-ur.json"));
}
export function getOfflineTranslit():  Promise<OfflineTranslData | null> {
  return (_translitPromise ??= loadJson<OfflineTranslData>("quran-translit.json"));
}
export function getOfflineSurahList(): Promise<SurahMeta[] | null> {
  return (_surahListPromise ??= loadJson<SurahMeta[]>("surah-list.json"));
}

// ── IndexedDB for downloaded translations ──────────────────────────────────────

const TRANS_DB_NAME    = "noor-translations";
const TRANS_DB_VERSION = 1;
const TRANS_STORE      = "packs";

async function openTranslDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TRANS_DB_NAME, TRANS_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TRANS_STORE)) {
        db.createObjectStore(TRANS_STORE, { keyPath: "lang" });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = ()  => reject(req.error);
  });
}

export interface DownloadedTranslation {
  lang:         TranslationLanguage;
  downloadedAt: number;
  data:         OfflineTranslData;
}

export async function getDownloadedTranslation(
  lang: TranslationLanguage
): Promise<DownloadedTranslation | null> {
  if (lang === "urdu") return null;
  try {
    const db = await openTranslDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(TRANS_STORE, "readonly");
      const req = tx.objectStore(TRANS_STORE).get(lang);
      req.onsuccess = () => resolve((req.result as DownloadedTranslation) ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getAllDownloadedTranslations(): Promise<TranslationLanguage[]> {
  try {
    const db = await openTranslDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(TRANS_STORE, "readonly");
      const req = tx.objectStore(TRANS_STORE).getAllKeys();
      req.onsuccess = () => resolve((req.result ?? []) as TranslationLanguage[]);
      req.onerror   = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function downloadTranslationPack(
  lang: TranslationLanguage,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  const edition = DOWNLOAD_EDITIONS[lang];
  if (!edition) throw new Error(`No edition for ${lang}`);

  const res = await fetch(`https://api.alquran.cloud/v1/quran/${edition}`);
  if (!res.ok) throw new Error(`API ${res.status}`);

  let jsonText: string;
  if (res.body && onProgress) {
    const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress(loaded, contentLength || loaded * 2);
    }
    const all = new Uint8Array(loaded);
    let off = 0;
    for (const c of chunks) { all.set(c, off); off += c.length; }
    jsonText = new TextDecoder().decode(all);
  } else {
    jsonText = await res.text();
    onProgress?.(1, 1);
  }

  const json = JSON.parse(jsonText);
  const surahs = (json?.data?.surahs ?? []) as Array<{
    number: number;
    ayahs: Array<{ text: string }>;
  }>;
  if (!surahs.length) throw new Error("Invalid API response");

  const compact: OfflineTranslData = {};
  for (const s of surahs) {
    compact[String(s.number)] = s.ayahs.map((a) => a.text);
  }

  const record: DownloadedTranslation = { lang, downloadedAt: Date.now(), data: compact };
  const db = await openTranslDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TRANS_STORE, "readwrite");
    tx.objectStore(TRANS_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function deleteTranslationPack(lang: TranslationLanguage): Promise<void> {
  try {
    const db = await openTranslDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TRANS_STORE, "readwrite");
      tx.objectStore(TRANS_STORE).delete(lang);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

/**
 * Returns ayah texts for a surah from bundled/downloaded offline data.
 * Returns null if not available offline.
 */
export async function getOfflineTranslationTexts(
  lang: TranslationLanguage,
  surahNumber: number
): Promise<string[] | null> {
  if (lang === "arabic") {
    const d = await getOfflineArabic();
    return d?.[String(surahNumber)]?.ayahs.map((ayah) => ayah.t) ?? null;
  }
  if (lang === "urdu") {
    const d = await getOfflineUrdu();
    return d?.[String(surahNumber)] ?? null;
  }
  const rec = await getDownloadedTranslation(lang);
  return rec?.data[String(surahNumber)] ?? null;
}
