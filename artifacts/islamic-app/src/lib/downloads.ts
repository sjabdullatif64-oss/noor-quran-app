// Real offline download system: IndexedDB for audio, localStorage for text metadata

const DB_NAME    = "noor-audio";
const AUDIO_STORE = "audio";
const DB_VERSION  = 1;
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
    req.onerror  = () => reject(req.error);
  });
}

async function storeAudio(globalNum: number, buf: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, "readwrite");
    tx.objectStore(AUDIO_STORE).put(buf, globalNum);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function getAudioBlobUrl(globalNum: number): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(AUDIO_STORE, "readonly");
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
    const tx    = db.transaction(AUDIO_STORE, "readwrite");
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

/**
 * Returns the list of downloaded packs.
 *
 * Recovery pass: if a pack has text in localStorage but is absent from the
 * metadata (e.g. the app was killed between text-save and meta-save, or
 * Android cleared the noor-downloads-meta key under memory pressure) we
 * reconstruct the metadata entry so the pack re-appears in the UI.
 */
export function getDownloadedPacks(): DownloadedPack[] {
  let meta = loadMeta();
  const metaIds = new Set(meta.map((p) => p.id));
  let repaired = false;

  for (const pack of SURAH_PACKS) {
    if (metaIds.has(pack.id)) continue; // already in metadata
    const raw = localStorage.getItem(`noor-dl-text-${pack.id}`);
    if (!raw) continue; // truly not downloaded
    try {
      const ayahs = JSON.parse(raw) as Array<{ globalNum: number }>;
      meta = [
        ...meta,
        { ...pack, downloadedAt: Date.now(), ayahGlobals: ayahs.map((a) => a.globalNum) },
      ];
      repaired = true;
    } catch { /* corrupt text key — ignore */ }
  }

  if (repaired) saveMeta(meta); // persist the repair so next call is instant
  return meta;
}

export function isPackDownloaded(packId: string): boolean {
  return getDownloadedPacks().some((p) => p.id === packId);
}

// ── Resilient fetch with retry + timeout ─────────────────────────────────────
const AUDIO_CDN_PRIMARY   = "https://cdn.islamic.network/quran/audio/128/ar.alafasy";
const AUDIO_CDN_FALLBACK  = "https://everyayah.com/data/Alafasy_128kbps";

/** Fetch with a per-request timeout and automatic retry on failure. */
async function fetchWithRetry(
  url: string,
  timeoutMs = 15000,
  retries   = 3,
): Promise<ArrayBuffer> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache:  "no-store",
        mode:   "cors",
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.arrayBuffer();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) {
        // Exponential back-off: 500ms, 1s, 2s
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }
  throw lastErr;
}

/** Build the MP3 URL for a given global ayah number.
 *  everyayah.com uses zero-padded surah+ayah format, so we need the surah/ayah pair.
 */
function buildAudioUrl(
  globalNum: number,
  surahNum:  number,
  ayahNum:   number,
  useFallback = false,
): string {
  if (useFallback) {
    const s = String(surahNum).padStart(3, "0");
    const a = String(ayahNum).padStart(3, "0");
    return `${AUDIO_CDN_FALLBACK}/${s}${a}.mp3`;
  }
  return `${AUDIO_CDN_PRIMARY}/${globalNum}.mp3`;
}

// ── Download a pack with progress callback ────────────────────────────────────
export async function downloadPack(
  pack: SurahPack,
  onProgress: (completed: number, total: number) => void,
): Promise<void> {
  // 1. Fetch surah text + global ayah numbers from AlQuran Cloud
  const allAyahs: Array<{
    globalNum:     number;
    textAr:        string;
    numberInSurah: number;
    surahNum:      number;
  }> = [];

  for (const surahNum of pack.surahNumbers) {
    const res = await fetchWithRetry(
      `https://api.alquran.cloud/v1/surah/${surahNum}`,
      20000,
      3,
    );
    const data = JSON.parse(new TextDecoder().decode(res));
    if (data?.data?.ayahs) {
      for (const ayah of data.data.ayahs as Array<{
        number: number; text: string; numberInSurah: number;
      }>) {
        allAyahs.push({
          globalNum:     ayah.number,
          textAr:        ayah.text,
          numberInSurah: ayah.numberInSurah,
          surahNum,
        });
      }
    }
  }

  if (allAyahs.length === 0) throw new Error("No ayahs returned from API");

  // 2. Store text in localStorage
  localStorage.setItem(`noor-dl-text-${pack.id}`, JSON.stringify(allAyahs));

  // 3. Save pack metadata NOW — before audio downloads start.
  //
  //    Why early? Previously metadata was written only after ALL audio files
  //    downloaded.  If the download was interrupted (connection drop, Android
  //    killing the WebView, OS clearing storage under memory pressure) the
  //    metadata was never written.  On the next app open the pack appeared
  //    absent from the Downloads list even though the text was already saved.
  //
  //    Writing metadata here means the pack always appears in the Downloads
  //    list as soon as the text is fetched.  If audio is later incomplete the
  //    pack still shows up, and the user can delete + re-download cleanly.
  //    The getDownloadedPacks() recovery pass handles the reverse case
  //    (text exists, metadata was lost) as a belt-and-suspenders measure.
  const metaEarly = loadMeta().filter((p) => p.id !== pack.id);
  metaEarly.push({
    ...pack,
    downloadedAt: Date.now(),
    ayahGlobals:  allAyahs.map((a) => a.globalNum),
  });
  saveMeta(metaEarly);

  // 4. Download audio sequentially in small batches (2 at a time)
  //    Small batch size avoids rate-limiting and Android WebView concurrency limits.
  const total      = allAyahs.length;
  let   completed  = 0;
  const BATCH      = 2;
  const TIMEOUT_MS = 20000;

  onProgress(0, total);

  for (let i = 0; i < allAyahs.length; i += BATCH) {
    const batch = allAyahs.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (ayah) => {
        let buf: ArrayBuffer;
        try {
          // Primary CDN
          buf = await fetchWithRetry(
            buildAudioUrl(ayah.globalNum, ayah.surahNum, ayah.numberInSurah, false),
            TIMEOUT_MS,
            2,
          );
        } catch {
          // Fallback CDN (everyayah.com)
          buf = await fetchWithRetry(
            buildAudioUrl(ayah.globalNum, ayah.surahNum, ayah.numberInSurah, true),
            TIMEOUT_MS,
            2,
          );
        }
        await storeAudio(ayah.globalNum, buf);
        completed++;
        onProgress(completed, total);
      }),
    );

    // Small inter-batch delay to be polite to the CDN on slow connections
    if (i + BATCH < allAyahs.length) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }
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
    return JSON.parse(raw) as Array<{
      globalNum: number; textAr: string; numberInSurah: number; surahNum: number;
    }>;
  } catch { return []; }
}
