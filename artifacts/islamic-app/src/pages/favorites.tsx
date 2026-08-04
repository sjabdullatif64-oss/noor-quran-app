import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Heart, Search, Trash2, BookOpen, ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import {
  FavoriteSurah,
  FavoriteAyah,
  getFavSurahs,
  getFavAyahs,
  removeFavSurah,
  removeFavAyah,
} from "@/lib/favorites";
import { Input } from "@/components/ui/input";
import { getCurrentTranslationText } from "@/lib/api";
import { getLang, TRANSLATION_LANGUAGE_CHANGED_EVENT } from "@/lib/settings";

type Tab = "surahs" | "ayahs";

function ayahHref(ayah: FavoriteAyah): string {
  if (ayah.juzNumber) {
    return `/juz/${ayah.juzNumber}?surah=${ayah.surahNumber}&ayah=${ayah.ayahNumber}`;
  }
  return `/quran/${ayah.surahNumber}?ayah=${ayah.ayahNumber}`;
}

export function Favorites() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("surahs");
  const [surahs, setSurahs] = useState<FavoriteSurah[]>([]);
  const [ayahs, setAyahs] = useState<FavoriteAyah[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSurahs(getFavSurahs().sort((a, b) => b.savedAt - a.savedAt));
    let cancelled = false;
    const refreshTranslations = async () => {
      const savedAyahs = getFavAyahs().sort((a, b) => b.savedAt - a.savedAt);
      const language = getLang();
      setAyahs(savedAyahs);
      const translated = await Promise.all(
        savedAyahs.map(async (ayah) => ({
          ...ayah,
          textTranslation: await getCurrentTranslationText(
            language,
            ayah.surahNumber,
            ayah.ayahNumber,
          ),
        })),
      );
      if (!cancelled) setAyahs(translated);
    };
    void refreshTranslations();
    window.addEventListener(TRANSLATION_LANGUAGE_CHANGED_EVENT, refreshTranslations);
    return () => {
      cancelled = true;
      window.removeEventListener(TRANSLATION_LANGUAGE_CHANGED_EVENT, refreshTranslations);
    };
  }, []);

  const handleRemoveSurah = (number: number) => {
    removeFavSurah(number);
    setSurahs((prev) => prev.filter((s) => s.number !== number));
  };

  const handleRemoveAyah = (surahNumber: number, ayahNumber: number) => {
    removeFavAyah(surahNumber, ayahNumber);
    setAyahs((prev) =>
      prev.filter((a) => !(a.surahNumber === surahNumber && a.ayahNumber === ayahNumber))
    );
  };

  const filteredSurahs = surahs.filter(
    (s) =>
      s.englishName.toLowerCase().includes(query.toLowerCase()) ||
      s.number.toString().includes(query)
  );

  const filteredAyahs = ayahs.filter(
    (a) =>
      a.surahEnglishName.toLowerCase().includes(query.toLowerCase()) ||
      a.textAr.includes(query) ||
      a.textTranslation.toLowerCase().includes(query.toLowerCase())
  );

  const isEmpty = tab === "surahs" ? filteredSurahs.length === 0 : filteredAyahs.length === 0;

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500 bg-background"
    >
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link href="/more" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">{t("favorites_title")}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{t("favorites_subtitle")}</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("favorites_search_placeholder")}
            className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
            data-testid="input-favorites-search"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-5 flex gap-2">
        {(["surahs", "ayahs"] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${
              tab === tabKey
                ? "bg-muted text-foreground border-border"
                : "text-muted-foreground border-border hover:border-border"
            }`}
            data-testid={`tab-${tabKey}`}
          >
            {tabKey === "surahs" ? `${t("favorites_tab_surahs")} (${surahs.length})` : `${t("favorites_tab_ayahs")} (${ayahs.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {isEmpty ? (
          <EmptyState tab={tab} hasQuery={!!query} />
        ) : tab === "surahs" ? (
          filteredSurahs.map((surah) => (
            <div
              key={surah.number}
              className="group flex items-center gap-4 p-4 rounded-2xl border border-border hover:border-border transition-all bg-card"
              data-testid={`fav-surah-${surah.number}`}
            >
              <Link href={`/quran/${surah.number}`} className="flex-1 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 font-bold text-sm shrink-0">
                  {surah.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-semibold">{surah.englishName}</p>
                  <p className="text-muted-foreground text-xs">{surah.englishNameTranslation} · {surah.numberOfAyahs} {t("favorites_verses")}</p>
                </div>
                <p dir="rtl" className="font-arabic text-xl text-rose-600 shrink-0">{surah.name}</p>
              </Link>
              <button
                onClick={() => handleRemoveSurah(surah.number)}
                className="opacity-40 hover:opacity-100 active:opacity-100 transition-opacity w-8 h-8 rounded-full flex items-center justify-center text-destructive hover:bg-muted shrink-0"
                data-testid={`button-remove-fav-surah-${surah.number}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          filteredAyahs.map((ayah) => (
            <div
              key={`${ayah.surahNumber}-${ayah.ayahNumber}`}
              className="group flex gap-4 p-4 rounded-2xl border border-border hover:border-border transition-all bg-card"
              data-testid={`fav-ayah-${ayah.surahNumber}-${ayah.ayahNumber}`}
            >
              <Link href={ayahHref(ayah)} className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold bg-muted text-foreground rounded-full px-2.5 py-0.5 border border-border">
                    {ayah.surahEnglishName}
                  </span>
                    <span className="text-xs text-muted-foreground">{t("favorites_verse")} {ayah.ayahNumber}</span>
                  {ayah.juzNumber && (
                      <span className="text-xs text-muted-foreground">{t("favorites_juz")} {ayah.juzNumber}</span>
                  )}
                </div>
                <p dir="rtl" className="font-arabic text-xl leading-loose text-foreground text-right">
                  {ayah.textAr}
                </p>
                {ayah.textTranslation && (
                  <p dir="rtl" className="text-sm text-muted-foreground leading-relaxed text-right font-serif line-clamp-2">
                    {ayah.textTranslation}
                  </p>
                )}
              </Link>
              <button
                onClick={() => handleRemoveAyah(ayah.surahNumber, ayah.ayahNumber)}
                className="opacity-40 hover:opacity-100 active:opacity-100 transition-opacity w-8 h-8 rounded-full flex items-center justify-center text-destructive hover:bg-muted shrink-0 self-start mt-1"
                data-testid={`button-remove-fav-ayah-${ayah.surahNumber}-${ayah.ayahNumber}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab, hasQuery }: { tab: Tab; hasQuery: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center bg-muted">
        <Heart className="w-8 h-8 text-rose-600" />
      </div>
      <div>
        <p className="text-foreground font-medium">
          {hasQuery ? t("favorites_no_results_title") : tab === "surahs" ? t("favorites_empty_surahs_title") : t("favorites_empty_ayahs_title")}
        </p>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          {hasQuery
            ? t("favorites_no_results_sub")
            : tab === "surahs"
            ? t("favorites_empty_surahs_sub")
            : t("favorites_empty_ayahs_sub")}
        </p>
      </div>
      {!hasQuery && (
        <Link
          href="/quran"
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-primary border border-border hover:border-border transition-colors bg-primary/10"
          data-testid="link-go-quran"
        >
          <BookOpen className="w-4 h-4" />
          {t("favorites_open_quran")}
        </Link>
      )}
    </div>
  );
}
