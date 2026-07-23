import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, Download, Trash2, CheckCircle, Play, Pause, HardDrive, Wifi, XCircle, Search, Globe } from "lucide-react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n-context";
import {
  SURAH_PACKS,
  SurahPack,
  DownloadedPack,
  downloadPack,
  deletePack,
  getDownloadedPacks,
  getDownloadedAyahs,
  getAudioBlobUrl,
} from "@/lib/downloads";
import {
  downloadTranslationPack,
  deleteTranslationPack,
  getAllDownloadedTranslations,
  DOWNLOADABLE_TRANSLATIONS,
  TRANSLATION_PACK_SIZE,
} from "@/lib/offline-quran";
import { TRANSLATION_LABELS, TRANSLATION_ENGLISH_NAMES, type TranslationLanguage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

interface PackState {
  status: "idle" | "downloading" | "complete" | "error";
  progress: number;
  total: number;
  errorMsg?: string;
}

interface TranslState {
  status: "idle" | "downloading" | "complete" | "error";
  progress: number;
  total: number;
  errorMsg?: string;
}

/** Build the initial packStates map from what is currently persisted. */
function buildInitialPackStates(): Record<string, PackState> {
  const downloaded = getDownloadedPacks();
  const downloadedIds = new Set(downloaded.map((p) => p.id));
  const initial: Record<string, PackState> = {};
  for (const p of SURAH_PACKS) {
    initial[p.id] = {
      status:   downloadedIds.has(p.id) ? "complete" : "idle",
      progress: 0,
      total:    0,
    };
  }
  return initial;
}

export function Downloads() {
  const { t } = useI18n();
  // ── Both states initialized synchronously from localStorage so the UI is
  //    always correct on first render — no empty-flash or stale-data issues.
  const [packStates, setPackStates] = useState<Record<string, PackState>>(buildInitialPackStates);
  const [downloadedPacks, setDownloadedPacks] = useState<DownloadedPack[]>(() => getDownloadedPacks());
  const [search, setSearch] = useState("");

  const [playingPackId, setPlayingPackId] = useState<string | null>(null);
  const [playingAyahIdx, setPlayingAyahIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const { toast }   = useToast();

  // ── Translation pack state ────────────────────────────────────────────────
  const [translStates, setTranslStates] = useState<Record<string, TranslState>>(() => {
    const init: Record<string, TranslState> = {};
    for (const lang of DOWNLOADABLE_TRANSLATIONS) {
      init[lang] = { status: "idle", progress: 0, total: 0 };
    }
    return init;
  });

  useEffect(() => {
    getAllDownloadedTranslations().then((langs) => {
      setTranslStates((prev) => {
        const next = { ...prev };
        for (const lang of langs) {
          if (next[lang]) next[lang] = { ...next[lang], status: "complete" };
        }
        return next;
      });
    });
  }, []);

  // ── Single source of truth for refreshing both states from storage ──────────
  const refreshDownloads = useCallback(() => {
    const fresh = getDownloadedPacks();
    const freshIds = new Set(fresh.map((p) => p.id));

    setDownloadedPacks(fresh);

    // Re-sync packStates: mark packs that are now absent as idle,
    // packs that are present as complete (unless currently downloading).
    setPackStates((prev) => {
      const next = { ...prev };
      for (const p of SURAH_PACKS) {
        const cur = next[p.id];
        if (freshIds.has(p.id) && cur.status !== "downloading") {
          next[p.id] = { ...cur, status: "complete" };
        } else if (!freshIds.has(p.id) && cur.status === "complete") {
          next[p.id] = { ...cur, status: "idle", progress: 0, total: 0 };
        }
      }
      return next;
    });
  }, []);

  const setPackStatus = useCallback((packId: string, update: Partial<PackState>) => {
    setPackStates((prev) => ({ ...prev, [packId]: { ...prev[packId], ...update } }));
  }, []);

  const setTranslStatus = useCallback((lang: TranslationLanguage, update: Partial<TranslState>) => {
    setTranslStates((prev) => ({ ...prev, [lang]: { ...prev[lang], ...update } }));
  }, []);

  const handleTranslDownload = async (lang: TranslationLanguage) => {
    setTranslStatus(lang, { status: "downloading", progress: 0, total: 0 });
    try {
      await downloadTranslationPack(lang, (loaded, total) => {
        setTranslStatus(lang, { progress: loaded, total });
      });
      setTranslStatus(lang, { status: "complete" });
      toast({ title: t("downloads_toast_success"), description: `${TRANSLATION_ENGLISH_NAMES[lang]} ${t("downloads_toast_success_sub")}` });
    } catch {
      setTranslStatus(lang, { status: "error", errorMsg: "Download failed. Check your connection." });
      toast({ title: t("downloads_toast_fail"), description: t("downloads_toast_fail_sub"), variant: "destructive" });
    }
  };

  const handleTranslDelete = async (lang: TranslationLanguage) => {
    await deleteTranslationPack(lang);
    setTranslStatus(lang, { status: "idle", progress: 0, total: 0 });
    toast({ title: t("downloads_toast_deleted"), description: `${TRANSLATION_ENGLISH_NAMES[lang]} ${t("downloads_toast_deleted_sub")}` });
  };

  // ── Download ─────────────────────────────────────────────────────────────────
  const handleDownload = async (pack: SurahPack) => {
    setPackStatus(pack.id, { status: "downloading", progress: 0, total: 0 });
    try {
      await downloadPack(pack, (completed, total) => {
        setPackStatus(pack.id, { progress: completed, total });
      });
      // Mark complete then refresh both states from storage atomically
      setPackStatus(pack.id, { status: "complete" });
      refreshDownloads();
      toast({ title: t("downloads_toast_complete"), description: `${pack.name} ${t("downloads_toast_complete_sub")}` });
    } catch {
      setPackStatus(pack.id, { status: "error", errorMsg: "Download failed. Check your connection." });
      toast({ title: t("downloads_toast_fail"), description: t("downloads_toast_fail_sub"), variant: "destructive" });
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (packId: string) => {
    if (playingPackId === packId) stopPlayer();
    await deletePack(packId);
    refreshDownloads();
    toast({ title: t("downloads_toast_deleted"), description: t("downloads_toast_deleted_pack_sub") });
  };

  // ── Offline player ───────────────────────────────────────────────────────────
  const stopPlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];
    setPlayingPackId(null);
    setIsPlaying(false);
    setPlayingAyahIdx(0);
  }, []);

  const playOffline = useCallback(async (packId: string, ayahIdx = 0) => {
    const ayahs = getDownloadedAyahs(packId);
    if (!ayahs.length) return;
    const ayah = ayahs[ayahIdx];
    if (!ayah) return;

    const url = await getAudioBlobUrl(ayah.globalNum);
    if (!url) {
      toast({ title: t("downloads_toast_audio_missing"), description: t("downloads_toast_audio_missing_sub"), variant: "destructive" });
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    blobUrlsRef.current.push(url);
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingPackId(packId);
    setPlayingAyahIdx(ayahIdx);
    setIsPlaying(true);

    audio.addEventListener("ended", () => {
      const next = ayahIdx + 1;
      if (next < ayahs.length) {
        playOffline(packId, next);
      } else {
        setIsPlaying(false);
        setPlayingAyahIdx(0);
      }
    });
    audio.play().catch(() => setIsPlaying(false));
  }, [toast]);

  const togglePlay = useCallback((packId: string) => {
    if (playingPackId === packId && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else if (playingPackId === packId && !isPlaying) {
      audioRef.current?.play().catch(() => {});
      setIsPlaying(true);
    } else {
      stopPlayer();
      playOffline(packId, 0);
    }
  }, [playingPackId, isPlaying, stopPlayer, playOffline]);

  const usedMB = downloadedPacks.reduce((sum, p) => {
    const ayahs = getDownloadedAyahs(p.id);
    return sum + ayahs.length * 0.06; // ~60 KB per ayah
  }, 0);

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500 bg-background"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-6">
        <Link href="/more" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">{t("downloads_title")}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">{t("downloads_subtitle")}</p>
        </div>
      </div>

      {/* Storage bar */}
      <div className="mx-4 mb-5 rounded-2xl p-4 border border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <HardDrive className="w-4 h-4" />
            <span>{t("downloads_device_storage")}</span>
          </div>
          <span className="text-muted-foreground text-xs">{usedMB.toFixed(1)} MB {t("downloads_used")}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${Math.min((usedMB / 50) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* All Surahs — searchable list */}
      <div className="px-4 mb-6">
        {/* Section header + count */}
        <div className="flex items-center justify-between mb-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
              {t("downloads_all_surahs")} ({SURAH_PACKS.length})
          </p>
            <p className="text-muted-foreground text-xs">
             {SURAH_PACKS.filter((p) => packStates[p.id]?.status === "complete").length} {t("downloads_downloaded")}
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={t("downloads_search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-border transition-colors"
          />
        </div>

        {/* Filtered surah list */}
        <div className="space-y-2">
          {SURAH_PACKS.filter((pack) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
              pack.name.toLowerCase().includes(q) ||
              pack.nameAr.includes(search) ||
              pack.id.includes(`surah-${search}`)
            );
          }).map((pack) => {
            const state            = packStates[pack.id];
            const isComplete       = state?.status === "complete";
            const isDownloading    = state?.status === "downloading";
            const isError          = state?.status === "error";
            const progressPct      = state?.total > 0 ? Math.round((state.progress / state.total) * 100) : 0;
            const isOfflinePlaying = playingPackId === pack.id;
            // Surah number extracted from "surah-N" id
            const surahNum         = pack.id.startsWith("surah-") ? pack.id.slice(6) : "";

            return (
              <div
                key={pack.id}
                className="rounded-xl border border-border overflow-hidden bg-card"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Surah number badge */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: isComplete ? "hsl(var(--primary) / 0.18)" : "hsl(var(--secondary) / 0.07)",
                      color: isComplete ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                      border: isComplete ? "1px solid hsl(var(--primary) / 0.25)" : "1px solid hsl(var(--secondary) / 0.15)",
                    }}
                  >
                    {isComplete ? <CheckCircle className="w-4 h-4" /> : surahNum}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-foreground font-medium text-sm leading-tight truncate">{pack.name}</p>
                      <span dir="rtl" className="font-arabic text-muted-foreground text-sm shrink-0">{pack.nameAr}</span>
                    </div>
                    <p className="text-muted-foreground text-xs">{pack.description} · {pack.size}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isComplete && (
                      <button
                        onClick={() => togglePlay(pack.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-primary border border-border hover:border-border transition-all bg-primary/10"
                        data-testid={`button-play-offline-${pack.id}`}
                      >
                        {isOfflinePlaying && isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {!isComplete && !isDownloading && !isError && (
                      <button
                        onClick={() => handleDownload(pack)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-primary border border-border hover:border-border transition-colors bg-primary/10"
                        data-testid={`button-download-${pack.id}`}
                      >
                        <Download className="w-3 h-3" />
                        {t("downloads_save")}
                      </button>
                    )}

                    {isComplete && (
                      <button
                        onClick={() => handleDelete(pack.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-destructive hover:text-destructive/80 transition-colors"
                        data-testid={`button-delete-${pack.id}`}
                        aria-label={`Delete ${pack.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isError && (
                      <button
                        onClick={() => handleDownload(pack)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-destructive border border-border"
                      >
                        <XCircle className="w-3 h-3" />
                        {t("downloads_retry")}
                      </button>
                    )}

                    {isDownloading && (
                    <span className="text-muted-foreground text-xs tabular-nums">{progressPct}%</span>
                    )}
                  </div>
                </div>

                {/* Inline progress bar */}
                {isDownloading && (
                  <div className="px-3 pb-2.5">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {isError && (
                  <div className="px-3 pb-2">
                      <p className="text-destructive text-xs">{state.errorMsg}</p>
                  </div>
                )}

                {isOfflinePlaying && (
                    <div className="px-3 pb-2 border-t border-border pt-2">
                      <p className="text-muted-foreground text-xs">
                      {t("downloads_player_ayah")} {playingAyahIdx + 1} / {getDownloadedAyahs(pack.id).length}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Downloaded summary list */}
      {downloadedPacks.length > 0 && (
        <div className="px-4 space-y-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
            {t("downloads_summary_title")} ({downloadedPacks.length})
          </p>
          {downloadedPacks.map((pack) => (
            <div
              key={pack.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium">{pack.name}</p>
                <p className="text-muted-foreground text-xs">
                  {pack.ayahGlobals.length} {t("downloads_summary_item_sub")} {new Date(pack.downloadedAt).toLocaleDateString()}
                </p>
              </div>
              {/* Delete shortcut in summary row — always visible */}
              <button
                onClick={() => handleDelete(pack.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-destructive hover:text-destructive/80 transition-colors shrink-0"
                data-testid={`button-delete-summary-${pack.id}`}
                aria-label={`Delete ${pack.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Translation Packs ────────────────────────────────────────────────── */}
      <div className="px-4 mt-6 mb-6">
        <div className="flex items-center justify-between mb-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">
              {t("downloads_translation_packs")}
          </p>
          <p className="text-muted-foreground text-xs">{t("downloads_arabic_bundled")}</p>
        </div>

        {/* Bundled — Arabic */}
          <div className="rounded-xl border border-border overflow-hidden mb-2 bg-card">
          <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-border">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-sm">{t("downloads_lang_arabic")}</p>
              <p className="text-muted-foreground text-xs">{t("downloads_bundled")} · {t("downloads_always_offline")}</p>
            </div>
            <span className="text-muted-foreground text-xs font-medium px-2 py-1 rounded-full bg-muted border border-border">
              {t("downloads_bundled")}
            </span>
          </div>
        </div>

        {/* Bundled — Urdu */}
          <div className="rounded-xl border border-border overflow-hidden mb-3 bg-card">
          <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-border">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-sm">{t("downloads_lang_urdu")}</p>
              <p className="text-muted-foreground text-xs">{t("downloads_bundled")} · {t("downloads_always_offline")}</p>
            </div>
            <span className="text-muted-foreground text-xs font-medium px-2 py-1 rounded-full bg-muted border border-border">
              {t("downloads_bundled")}
            </span>
          </div>
        </div>

        {/* Downloadable translations */}
        <div className="space-y-2">
          {DOWNLOADABLE_TRANSLATIONS.map((lang) => {
            const ts          = translStates[lang];
            const isComplete  = ts?.status === "complete";
            const isDling     = ts?.status === "downloading";
            const isError     = ts?.status === "error";
            const pct         = ts?.total > 0 ? Math.round((ts.progress / ts.total) * 100) : 0;

            return (
                <div key={lang} className="rounded-xl border border-border overflow-hidden bg-card">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: isComplete ? "hsl(var(--primary) / 0.18)" : "hsl(var(--secondary) / 0.07)",
                      color:      isComplete ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                      border:     isComplete ? "1px solid hsl(var(--primary) / 0.25)" : "1px solid hsl(var(--secondary) / 0.15)",
                    }}>
                    {isComplete ? <CheckCircle className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-foreground font-medium text-sm">{TRANSLATION_ENGLISH_NAMES[lang]}</p>
                      <span className="text-muted-foreground text-sm">{TRANSLATION_LABELS[lang]}</span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {isComplete ? t("downloads_downloaded_offline") : TRANSLATION_PACK_SIZE[lang]}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isComplete && !isDling && !isError && (
                      <button
                        onClick={() => handleTranslDownload(lang)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-primary border border-border hover:border-border transition-colors bg-primary/10">
                        <Download className="w-3 h-3" />
                        {t("downloads_save")}
                      </button>
                    )}
                    {isComplete && (
                      <button
                        onClick={() => handleTranslDelete(lang)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-destructive hover:text-destructive/80 transition-colors"
                        aria-label={`Delete ${lang} translation`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isError && (
                      <button
                        onClick={() => handleTranslDownload(lang)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-destructive border border-border">
                        <XCircle className="w-3 h-3" />
                        {t("downloads_retry")}
                      </button>
                    )}
                    {isDling && (
                    <span className="text-muted-foreground text-xs tabular-nums">{pct}%</span>
                    )}
                  </div>
                </div>
                {isDling && (
                  <div className="px-3 pb-2.5">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {isError && (
                  <div className="px-3 pb-2">
                    <p className="text-destructive text-xs">{ts.errorMsg}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-muted-foreground text-xs mt-8 pb-4 px-4">
        {t("downloads_audio_local")} {t("downloads_audio_delete_anytime")}
      </p>
    </div>
  );
}
