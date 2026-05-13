import { useState, useCallback } from "react";
import { ChevronLeft, Download, Trash2, CheckCircle, Play, Pause, HardDrive, Wifi, XCircle } from "lucide-react";
import { Link } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

interface PackState {
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
  // ── Both states initialized synchronously from localStorage so the UI is
  //    always correct on first render — no empty-flash or stale-data issues.
  const [packStates, setPackStates] = useState<Record<string, PackState>>(buildInitialPackStates);
  const [downloadedPacks, setDownloadedPacks] = useState<DownloadedPack[]>(() => getDownloadedPacks());

  const [playingPackId, setPlayingPackId] = useState<string | null>(null);
  const [playingAyahIdx, setPlayingAyahIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const { toast }   = useToast();

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
      toast({ title: "Download complete!", description: `${pack.name} is now available offline.` });
    } catch {
      setPackStatus(pack.id, { status: "error", errorMsg: "Download failed. Check your connection." });
      toast({ title: "Download failed", description: "Please check your internet connection.", variant: "destructive" });
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (packId: string) => {
    if (playingPackId === packId) stopPlayer();
    await deletePack(packId);
    refreshDownloads();
    toast({ title: "Deleted", description: "Pack removed from your device." });
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
      toast({ title: "Audio not cached", description: "Please download this pack again.", variant: "destructive" });
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
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-6">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Downloads</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Save surahs for offline reading & playback</p>
        </div>
      </div>

      {/* Storage bar */}
      <div className="mx-4 mb-5 rounded-2xl p-4 border border-emerald-900/40" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <HardDrive className="w-4 h-4" />
            <span>Device Storage</span>
          </div>
          <span className="text-emerald-600 text-xs">{usedMB.toFixed(1)} MB used</span>
        </div>
        <div className="h-2 bg-emerald-900/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${Math.min((usedMB / 50) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Available packs */}
      <div className="px-4 space-y-3 mb-6">
        <p className="text-emerald-500 text-xs uppercase tracking-wider font-medium">Available Packs</p>
        {SURAH_PACKS.map((pack) => {
          const state         = packStates[pack.id];
          const isComplete    = state.status === "complete";
          const isDownloading = state.status === "downloading";
          const isError       = state.status === "error";
          const progressPct   = state.total > 0 ? Math.round((state.progress / state.total) * 100) : 0;
          const isOfflinePlaying = playingPackId === pack.id;

          return (
            <div
              key={pack.id}
              className="rounded-2xl border border-emerald-900/40 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isComplete ? "rgba(52,211,153,0.15)" : "rgba(45,212,191,0.08)",
                    border: "1px solid rgba(52,211,153,0.2)",
                  }}>
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Wifi className="w-5 h-5 text-teal-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{pack.name}</p>
                    <span dir="rtl" className="font-arabic text-emerald-500 text-sm">{pack.nameAr}</span>
                  </div>
                  <p className="text-emerald-700 text-xs mt-0.5">{pack.description} · {pack.size}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Play/pause offline audio */}
                  {isComplete && (
                    <button
                      onClick={() => togglePlay(pack.id)}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-800/40 hover:border-emerald-600 transition-all"
                      style={{ background: "rgba(52,211,153,0.1)" }}
                      data-testid={`button-play-offline-${pack.id}`}
                    >
                      {isOfflinePlaying && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Download button */}
                  {!isComplete && !isDownloading && (
                    <button
                      onClick={() => handleDownload(pack)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-teal-300 border border-teal-800/40 hover:border-teal-600 transition-colors"
                      style={{ background: "rgba(45,212,191,0.08)" }}
                      data-testid={`button-download-${pack.id}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Save
                    </button>
                  )}

                  {/* Delete — always fully visible on mobile (no hover-only opacity) */}
                  {isComplete && (
                    <button
                      onClick={() => handleDelete(pack.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                      data-testid={`button-delete-${pack.id}`}
                      aria-label={`Delete ${pack.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Retry on error */}
                  {isError && (
                    <button
                      onClick={() => handleDownload(pack)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-red-300 border border-red-800/40"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {isDownloading && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span>Downloading audio…</span>
                    <span>{state.progress}/{state.total} files · {progressPct}%</span>
                  </div>
                  <div className="h-1.5 bg-emerald-900/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {isError && (
                <div className="px-4 pb-3">
                  <p className="text-red-400 text-xs">{state.errorMsg}</p>
                </div>
              )}

              {/* Offline player info */}
              {isOfflinePlaying && (
                <div className="px-4 pb-3 border-t border-emerald-900/30 pt-3">
                  <p className="text-emerald-500 text-xs">
                    ▶ Playing offline · Ayah {playingAyahIdx + 1} of {getDownloadedAyahs(pack.id).length}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Downloaded summary list */}
      {downloadedPacks.length > 0 && (
        <div className="px-4 space-y-3">
          <p className="text-emerald-500 text-xs uppercase tracking-wider font-medium">
            Downloaded ({downloadedPacks.length})
          </p>
          {downloadedPacks.map((pack) => (
            <div
              key={pack.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-emerald-900/30"
              style={{ background: "rgba(52,211,153,0.04)" }}
            >
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-emerald-300 text-sm font-medium">{pack.name}</p>
                <p className="text-emerald-800 text-xs">
                  {pack.ayahGlobals.length} ayahs · Saved {new Date(pack.downloadedAt).toLocaleDateString()}
                </p>
              </div>
              {/* Delete shortcut in summary row — always visible */}
              <button
                onClick={() => handleDelete(pack.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition-colors shrink-0"
                data-testid={`button-delete-summary-${pack.id}`}
                aria-label={`Delete ${pack.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-emerald-900 text-xs mt-8 pb-4 px-4">
        Audio stored locally on your device. Delete anytime to free space.
      </p>
    </div>
  );
}
