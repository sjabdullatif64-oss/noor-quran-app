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

// [surahNumber, englishName, arabicName, ayahCount]
// Source: standard Quran surah table (Hafs 'an 'Asim)
const QURAN_SURAH_DATA: [number, string, string, number][] = [
  [1,  "Al-Fatiha",      "الفاتحة",    7],
  [2,  "Al-Baqarah",     "البقرة",     286],
  [3,  "Ali 'Imran",     "آل عمران",   200],
  [4,  "An-Nisa",        "النساء",     176],
  [5,  "Al-Ma'idah",     "المائدة",    120],
  [6,  "Al-An'am",       "الأنعام",    165],
  [7,  "Al-A'raf",       "الأعراف",    206],
  [8,  "Al-Anfal",       "الأنفال",    75],
  [9,  "At-Tawbah",      "التوبة",     129],
  [10, "Yunus",          "يونس",       109],
  [11, "Hud",            "هود",        123],
  [12, "Yusuf",          "يوسف",       111],
  [13, "Ar-Ra'd",        "الرعد",      43],
  [14, "Ibrahim",        "إبراهيم",    52],
  [15, "Al-Hijr",        "الحجر",      99],
  [16, "An-Nahl",        "النحل",      128],
  [17, "Al-Isra",        "الإسراء",    111],
  [18, "Al-Kahf",        "الكهف",      110],
  [19, "Maryam",         "مريم",       98],
  [20, "Ta-Ha",          "طه",         135],
  [21, "Al-Anbiya",      "الأنبياء",   112],
  [22, "Al-Hajj",        "الحج",       78],
  [23, "Al-Mu'minun",    "المؤمنون",   118],
  [24, "An-Nur",         "النور",      64],
  [25, "Al-Furqan",      "الفرقان",    77],
  [26, "Ash-Shu'ara",    "الشعراء",    227],
  [27, "An-Naml",        "النمل",      93],
  [28, "Al-Qasas",       "القصص",      88],
  [29, "Al-'Ankabut",    "العنكبوت",   69],
  [30, "Ar-Rum",         "الروم",      60],
  [31, "Luqman",         "لقمان",      34],
  [32, "As-Sajdah",      "السجدة",     30],
  [33, "Al-Ahzab",       "الأحزاب",    73],
  [34, "Saba",           "سبأ",        54],
  [35, "Fatir",          "فاطر",       45],
  [36, "Ya-Sin",         "يس",         83],
  [37, "As-Saffat",      "الصافات",    182],
  [38, "Sad",            "ص",          88],
  [39, "Az-Zumar",       "الزمر",      75],
  [40, "Ghafir",         "غافر",       85],
  [41, "Fussilat",       "فصلت",       54],
  [42, "Ash-Shura",      "الشورى",     53],
  [43, "Az-Zukhruf",     "الزخرف",     89],
  [44, "Ad-Dukhan",      "الدخان",     59],
  [45, "Al-Jathiyah",    "الجاثية",    37],
  [46, "Al-Ahqaf",       "الأحقاف",    35],
  [47, "Muhammad",       "محمد",       38],
  [48, "Al-Fath",        "الفتح",      29],
  [49, "Al-Hujurat",     "الحجرات",    18],
  [50, "Qaf",            "ق",          45],
  [51, "Adh-Dhariyat",   "الذاريات",   60],
  [52, "At-Tur",         "الطور",      49],
  [53, "An-Najm",        "النجم",      62],
  [54, "Al-Qamar",       "القمر",      55],
  [55, "Ar-Rahman",      "الرحمن",     78],
  [56, "Al-Waqi'ah",     "الواقعة",    96],
  [57, "Al-Hadid",       "الحديد",     29],
  [58, "Al-Mujadila",    "المجادلة",   22],
  [59, "Al-Hashr",       "الحشر",      24],
  [60, "Al-Mumtahanah",  "الممتحنة",   13],
  [61, "As-Saf",         "الصف",       14],
  [62, "Al-Jumu'ah",     "الجمعة",     11],
  [63, "Al-Munafiqun",   "المنافقون",  11],
  [64, "At-Taghabun",    "التغابن",    18],
  [65, "At-Talaq",       "الطلاق",     12],
  [66, "At-Tahrim",      "التحريم",    12],
  [67, "Al-Mulk",        "الملك",      30],
  [68, "Al-Qalam",       "القلم",      52],
  [69, "Al-Haqqah",      "الحاقة",     52],
  [70, "Al-Ma'arij",     "المعارج",    44],
  [71, "Nuh",            "نوح",        28],
  [72, "Al-Jinn",        "الجن",       28],
  [73, "Al-Muzzammil",   "المزمل",     20],
  [74, "Al-Muddaththir", "المدثر",     56],
  [75, "Al-Qiyamah",     "القيامة",    40],
  [76, "Al-Insan",       "الإنسان",    31],
  [77, "Al-Mursalat",    "المرسلات",   50],
  [78, "An-Naba",        "النبأ",      40],
  [79, "An-Nazi'at",     "النازعات",   46],
  [80, "Abasa",          "عبس",        42],
  [81, "At-Takwir",      "التكوير",    29],
  [82, "Al-Infitar",     "الانفطار",   19],
  [83, "Al-Mutaffifin",  "المطففين",   36],
  [84, "Al-Inshiqaq",    "الانشقاق",   25],
  [85, "Al-Buruj",       "البروج",     22],
  [86, "At-Tariq",       "الطارق",     17],
  [87, "Al-A'la",        "الأعلى",     19],
  [88, "Al-Ghashiyah",   "الغاشية",    26],
  [89, "Al-Fajr",        "الفجر",      30],
  [90, "Al-Balad",       "البلد",      20],
  [91, "Ash-Shams",      "الشمس",      15],
  [92, "Al-Layl",        "الليل",      21],
  [93, "Ad-Duha",        "الضحى",      11],
  [94, "Ash-Sharh",      "الشرح",      8],
  [95, "At-Tin",         "التين",      8],
  [96, "Al-Alaq",        "العلق",      19],
  [97, "Al-Qadr",        "القدر",      5],
  [98, "Al-Bayyinah",    "البينة",     8],
  [99, "Az-Zalzalah",    "الزلزلة",    8],
  [100, "Al-Adiyat",     "العاديات",   11],
  [101, "Al-Qari'ah",    "القارعة",    11],
  [102, "At-Takathur",   "التكاثر",    8],
  [103, "Al-Asr",        "العصر",      3],
  [104, "Al-Humazah",    "الهمزة",     9],
  [105, "Al-Fil",        "الفيل",      5],
  [106, "Quraysh",       "قريش",       4],
  [107, "Al-Ma'un",      "الماعون",    7],
  [108, "Al-Kawthar",    "الكوثر",     3],
  [109, "Al-Kafirun",    "الكافرون",   6],
  [110, "An-Nasr",       "النصر",      3],
  [111, "Al-Masad",      "المسد",      5],
  [112, "Al-Ikhlas",     "الإخلاص",    4],
  [113, "Al-Falaq",      "الفلق",      5],
  [114, "An-Nas",        "الناس",      6],
];

export const SURAH_PACKS: SurahPack[] = QURAN_SURAH_DATA.map(
  ([num, name, nameAr, ayahs]) => ({
    id:           `surah-${num}`,
    name,
    nameAr,
    description:  `${ayahs} verses`,
    size:         `~${(ayahs * 0.065).toFixed(1)} MB`,
    surahNumbers: [num],
  }),
);

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
