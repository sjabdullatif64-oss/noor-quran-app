// Real offline download system: IndexedDB for audio, localStorage for text metadata

const DB_NAME = "noor-audio";
const AUDIO_STORE = "audio";
const DB_VERSION = 1;
const PACK_META_KEY = "noor-downloads-meta";

export interface SurahPack {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  size: string;
  surahNumbers: number[];
}

export interface DownloadedPack extends SurahPack {
  downloadedAt: number;
  ayahGlobals: number[];
}

export const SURAH_PACKS: SurahPack[] = [
  {
    id: "al-fatiha",
    name: "Al-Fatiha",
    nameAr: "الفاتحة",
    description: "The Opening · 7 verses",
    size: "~0.5 MB",
    surahNumbers: [1],
  },
  {
    id: "last-10",
    name: "Last 10 Surahs",
    nameAr: "جزء عمّ",
    description: "Juz Amma · ~48 verses",
    size: "~3 MB",
    surahNumbers: [105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
  },
  {
    id: "yaseen",
    name: "Surah Yaseen",
    nameAr: "يس",
    description: "Heart of the Quran · 83 verses",
    size: "~4 MB",
    surahNumbers: [36],
  },
  {
    id: "al-mulk",
    name: "Surah Al-Mulk",
    nameAr: "الملك",
    description: "The Sovereignty · 30 verses",
    size: "~2 MB",
    surahNumbers: [67],
  },
];

// ── IndexedDB ────────────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(AUDIO_STORE)) {
        req.result.createObjectStore(AUDIO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeAudio(globalNum: number, buf: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, "readwrite");
    tx.objectStore(AUDIO_STORE).put(buf, globalNum);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioBlobUrl(globalNum: number): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(AUDIO_STORE, "readonly");
      const req = tx.objectStore(AUDIO_STORE).get(globalNum);
      req.onsuccess = () => {
        if (!req.result) { resolve(null); return; }
        const blob = new Blob([req.result as ArrayBuffer], { type: "audio/mpeg" });
        resolve(URL.createObjectURL(blob));
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function deleteAudios(globals: number[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(AUDIO_STORE, "readwrite");
    const store = tx.objectStore(AUDIO_STORE);
    globals.forEach((n) => store.delete(n));
    tx.oncomplete = () => resolve();
  });
}

// ── Pack metadata (localStorage) ─────────────────────────────────────────────
function loadMeta(): DownloadedPack[] {
  try { return JSON.parse(localStorage.getItem(PACK_META_KEY) ?? "[]"); }
  catch { return []; }
}
function saveMeta(packs: DownloadedPack[]): void {
  localStorage.setItem(PACK_META_KEY, JSON.stringify(packs));
}

export function getDownloadedPacks(): DownloadedPack[] {
  return loadMeta();
}

export function isPackDownloaded(packId: string): boolean {
  return loadMeta().some((p) => p.id === packId);
}

// ── Download a pack with progress callback ───────────────────────────────────
export async function downloadPack(
  pack: SurahPack,
  onProgress: (completed: number, total: number) => void
): Promise<void> {
  // 1. Fetch surah text + global ayah numbers
  const allAyahs: Array<{ globalNum: number; textAr: string; numberInSurah: number; surahNum: number }> = [];

  for (const surahNum of pack.surahNumbers) {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
    if (!res.ok) throw new Error(`Failed to fetch surah ${surahNum}`);
    const data = await res.json();
    for (const ayah of data.data.ayahs as Array<{ number: number; text: string; numberInSurah: number }>) {
      allAyahs.push({
        globalNum: ayah.number,
        textAr: ayah.text,
        numberInSurah: ayah.numberInSurah,
        surahNum,
      });
    }
  }

  // 2. Store text in localStorage
  localStorage.setItem(`noor-dl-text-${pack.id}`, JSON.stringify(allAyahs));

  // 3. Download audio in batches of 4
  const total = allAyahs.length;
  let completed = 0;
  onProgress(0, total);

  const BATCH = 4;
  for (let i = 0; i < allAyahs.length; i += BATCH) {
    const batch = allAyahs.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (ayah) => {
        const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayah.globalNum}.mp3`;
        const res = await fetch(url);
        if (!res.ok) return;
        const buf = await res.arrayBuffer();
        await storeAudio(ayah.globalNum, buf);
        completed++;
        onProgress(completed, total);
      })
    );
  }

  // 4. Save pack metadata
  const meta = loadMeta().filter((p) => p.id !== pack.id);
  meta.push({
    ...pack,
    downloadedAt: Date.now(),
    ayahGlobals: allAyahs.map((a) => a.globalNum),
  });
  saveMeta(meta);
}

// ── Delete a downloaded pack ──────────────────────────────────────────────────
export async function deletePack(packId: string): Promise<void> {
  const meta = loadMeta();
  const pack = meta.find((p) => p.id === packId);
  if (pack) await deleteAudios(pack.ayahGlobals);
  localStorage.removeItem(`noor-dl-text-${packId}`);
  saveMeta(meta.filter((p) => p.id !== packId));
}

// ── Get cached text ayahs ─────────────────────────────────────────────────────
export function getDownloadedAyahs(packId: string) {
  try {
    const raw = localStorage.getItem(`noor-dl-text-${packId}`);
    if (!raw) return [];
    return JSON.parse(raw) as Array<{ globalNum: number; textAr: string; numberInSurah: number; surahNum: number }>;
  } catch { return []; }
}
