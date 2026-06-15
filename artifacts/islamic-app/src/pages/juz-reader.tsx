import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Loader2, AlertCircle, BookOpen } from "lucide-react";
import { JUZ_DATA } from "@/lib/juz-data";
import { getLang } from "@/lib/settings";
import {
  TRANSLATION_EDITIONS,
  RTL_LANGUAGES,
  sanitizeTranslation,
  type TranslationLanguage,
} from "@/lib/api";

const SURAH_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6,
];

interface JuzAyah {
  numberInSurah: number;
  globalNumber: number;
  textAr: string;
  textTranslation: string;
}

interface JuzSection {
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  surahEnglishNameTranslation: string;
  ayahs: JuzAyah[];
}

async function safeFetch(url: string): Promise<unknown> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

async function fetchSurahRange(
  surahNumber: number,
  lang: TranslationLanguage,
  fromAyah: number,
  toAyah: number
): Promise<JuzSection | null> {
  const edition = TRANSLATION_EDITIONS[lang];
  const [arData, trData] = await Promise.all([
    safeFetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`),
    safeFetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${edition}`),
  ]);

  type RawAyah = { number: number; numberInSurah: number; text: string };
  const ar = arData as {
    data: {
      name: string;
      englishName: string;
      englishNameTranslation: string;
      ayahs: RawAyah[];
    };
  } | null;
  if (!ar?.data?.ayahs) return null;

  const trAyahs =
    (trData as { data?: { ayahs?: { text: string }[] } } | null)?.data?.ayahs ?? [];

  const ayahs: JuzAyah[] = ar.data.ayahs
    .filter((a) => a.numberInSurah >= fromAyah && a.numberInSurah <= toAyah)
    .map((a) => ({
      numberInSurah: a.numberInSurah,
      globalNumber: a.number,
      textAr: a.text,
      textTranslation: sanitizeTranslation(lang, trAyahs[a.numberInSurah - 1]?.text ?? ""),
    }));

  if (ayahs.length === 0) return null;

  return {
    surahNumber,
    surahName: ar.data.name,
    surahEnglishName: ar.data.englishName,
    surahEnglishNameTranslation: ar.data.englishNameTranslation,
    ayahs,
  };
}

export function JuzReader() {
  const { number } = useParams<{ number: string }>();
  const [, navigate] = useLocation();
  const juzNumber = parseInt(number ?? "1", 10);

  const [sections, setSections] = useState<JuzSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const cancelRef = useRef<() => void>(() => {});

  const juzInfo = JUZ_DATA[juzNumber - 1];

  function load() {
    if (!juzInfo) return;
    cancelRef.current();
    let cancelled = false;
    cancelRef.current = () => { cancelled = true; };

    setLoading(true);
    setError(false);
    setSections([]);

    const lang = getLang();
    const startSurah = juzInfo.surahNumber;
    const startAyah  = juzInfo.startAyah;
    const nextJuz    = JUZ_DATA[juzNumber];
    const endSurah   = nextJuz ? nextJuz.surahNumber : 114;
    const endAyahExc = nextJuz ? nextJuz.startAyah : SURAH_AYAH_COUNTS[113] + 1;

    type Range = { surah: number; from: number; to: number };
    const ranges: Range[] = [];
    for (let s = startSurah; s <= endSurah; s++) {
      const from = s === startSurah ? startAyah : 1;
      const to   = s === endSurah ? endAyahExc - 1 : SURAH_AYAH_COUNTS[s - 1];
      if (to >= from) ranges.push({ surah: s, from, to });
    }

    Promise.all(ranges.map((r) => fetchSurahRange(r.surah, lang, r.from, r.to)))
      .then((results) => {
        if (cancelled) return;
        const valid = results.filter(Boolean) as JuzSection[];
        valid.length === 0 ? setError(true) : setSections(valid);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
  }

  useEffect(() => {
    load();
    return () => cancelRef.current();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juzNumber]);

  const isRTL = RTL_LANGUAGES.has(getLang());

  if (!juzInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}>
        <p className="text-emerald-500">Invalid Juz number</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}>

      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b border-emerald-900/50"
        style={{ background: "rgba(7,26,14,0.97)", backdropFilter: "blur(8px)" }}>
        <button
          onClick={() => navigate("/quran")}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-emerald-900/50 text-emerald-400 shrink-0 active:scale-95 transition-transform">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-emerald-300 font-bold text-base">Juz {juzNumber}</p>
          <p className="text-emerald-700 text-xs truncate">
            {juzInfo.surahName} · Ayah {juzInfo.startAyah}
            {sections.length > 1 && ` — ${sections[sections.length - 1].surahEnglishName}`}
          </p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-900/40 bg-emerald-950/40">
          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-emerald-600 text-xs font-medium">{juzNumber} / 30</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-emerald-700 text-sm">Loading Juz {juzNumber}…</p>
          <p className="text-emerald-900 text-xs">Fetching all surahs in this Juz</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 px-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500/60" />
          <p className="text-emerald-500 text-sm">Failed to load. Check your internet connection.</p>
          <button
            onClick={load}
            className="px-5 py-2 rounded-xl bg-emerald-800/40 border border-emerald-800/50 text-emerald-400 text-sm active:scale-95 transition-transform">
            Retry
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-8">
          {sections.map((section) => (
            <div key={section.surahNumber}>
              <div
                className="flex items-center justify-between mb-4 py-3 px-4 rounded-2xl border border-emerald-800/40"
                style={{ background: "rgba(10,30,18,0.7)" }}>
                <div>
                  <p className="text-emerald-300 font-bold">{section.surahEnglishName}</p>
                  <p className="text-emerald-600 text-xs">{section.surahEnglishNameTranslation}</p>
                </div>
                <p dir="rtl" className="font-arabic text-2xl text-emerald-400">{section.surahName}</p>
              </div>

              <div className="space-y-3">
                {section.ayahs.map((ayah) => (
                  <div
                    key={`${section.surahNumber}-${ayah.numberInSurah}`}
                    className="rounded-xl p-4 border border-emerald-900/30"
                    style={{ background: "rgba(10,30,18,0.5)" }}>
                    <p dir="rtl"
                      className="font-arabic text-xl text-right text-emerald-100 leading-loose mb-3">
                      {ayah.textAr}
                      <span className="text-emerald-500 text-base mr-2"> ﴿{ayah.numberInSurah}﴾</span>
                    </p>

                    {ayah.textTranslation && (
                      <p
                        className={`text-emerald-400 text-sm leading-relaxed pt-2 border-t border-emerald-900/30 ${
                          isRTL ? "text-right" : "text-left"
                        }`}
                        dir={isRTL ? "rtl" : "ltr"}>
                        {ayah.textTranslation}
                      </p>
                    )}

                    <div className="flex justify-end mt-2">
                      <span className="text-[10px] text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-900/40">
                        {section.surahNumber}:{ayah.numberInSurah}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
