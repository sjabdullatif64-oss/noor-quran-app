import { useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft, RefreshCw, Play, ExternalLink, Sparkles,
  Clock, Tag, ImageOff, Wifi,
} from "lucide-react";

// ── Google Sheet config ───────────────────────────────────────────────────────
const SHEET_ID = "1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

// ── Types ─────────────────────────────────────────────────────────────────────
interface UpdateItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url: string;
  button_text: string;
  target_link: string;
  category: string;
  status: string;
  created_at: string;
}

// ── Sheet parser ──────────────────────────────────────────────────────────────
// GViz format: column names live in table.cols[].label (already consumed by
// parsedNumHeaders:1). table.rows[] contains ONLY data rows — never a header row.
function parseGViz(text: string): UpdateItem[] {
  try {
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
    if (!match) return [];
    const data = JSON.parse(match[1]) as {
      status: string;
      table: {
        cols: Array<{ id: string; label: string; type: string }>;
        rows: Array<{ c: Array<{ v: string | number | null } | null> }>;
      };
    };
    if (data.status !== "ok") return [];

    const cols = data.table.cols ?? [];
    const rows = data.table.rows ?? [];
    if (!cols.length || !rows.length) return [];

    // Headers come from cols[].label — NOT from rows[0]
    const headers = cols.map((col) => col.label?.toString().trim() ?? "");
    const items: UpdateItem[] = [];

    for (const row of rows) {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const cell = row.c?.[idx];
        const val  = cell?.v;
        obj[h] = val != null ? val.toString().trim() : "";
      });
      // Only keep rows that have a title and status = active
      if (obj.title && obj.status?.toLowerCase() === "active") {
        items.push(obj as unknown as UpdateItem);
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchUpdates(): Promise<UpdateItem[]> {
  const res = await fetch(SHEET_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error("Failed to fetch");
  const text = await res.text();
  return parseGViz(text);
}

// ── TanStack Query hook ───────────────────────────────────────────────────────
function useUpdates() {
  return useQuery({
    queryKey: ["updates"],
    queryFn: fetchUpdates,
    staleTime: 60_000,             // consider fresh for 1 min
    refetchOnWindowFocus: true,    // re-fetch when user comes back
    refetchInterval: 3 * 60_000,   // auto-refresh every 3 min
    retry: 2,
  });
}

// ── Category accent map ───────────────────────────────────────────────────────
function categoryStyle(cat: string): { bg: string; text: string; border: string } {
  const c = cat?.toLowerCase() ?? "";
  if (c.includes("quran"))    return { bg: "rgba(52,211,153,0.12)",  text: "text-emerald-300", border: "border-emerald-700/40" };
  if (c.includes("prayer"))   return { bg: "rgba(96,165,250,0.12)",  text: "text-blue-300",    border: "border-blue-700/40"    };
  if (c.includes("event"))    return { bg: "rgba(168,85,247,0.12)",  text: "text-purple-300",  border: "border-purple-700/40"  };
  if (c.includes("feature"))  return { bg: "rgba(234,179,8,0.12)",   text: "text-yellow-300",  border: "border-yellow-700/40"  };
  if (c.includes("update"))   return { bg: "rgba(249,115,22,0.12)",  text: "text-orange-300",  border: "border-orange-700/40"  };
  return                             { bg: "rgba(45,212,191,0.10)",   text: "text-teal-300",    border: "border-teal-800/40"    };
}

function formatDate(str: string): string {
  if (!str) return "";
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return str;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export function Updates() {
  const { data: items = [], isLoading, isError, isFetching, refetch, dataUpdatedAt } = useUpdates();

  // Category filter
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))];
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? items
    : items.filter((i) => i.category === activeCategory);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((containerRef.current?.scrollTop ?? 0) === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if ((containerRef.current?.scrollTop ?? 1) > 0) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) {
      setPullY(Math.min(dy * 0.45, 64));
      setIsPulling(true);
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= 48) refetch();
    setPullY(0);
    setIsPulling(false);
  }, [pullY, refetch]);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      ref={containerRef}
      className="min-h-screen pb-28 md:pb-10 overflow-y-auto"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-300"
        style={{ height: pullY > 0 ? `${pullY}px` : 0 }}
      >
        <RefreshCw
          className={`w-5 h-5 text-emerald-400 transition-transform ${isPulling && pullY >= 48 ? "rotate-180" : ""}`}
          style={{ transform: `rotate(${(pullY / 64) * 180}deg)` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Updates</h1>
          {lastUpdated && !isLoading && (
            <p className="text-emerald-800 text-xs mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Refreshed at {lastUpdated}
            </p>
          )}
        </div>

        {/* Manual refresh button */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-emerald-800/40 text-emerald-500 hover:text-emerald-300 hover:border-emerald-600 transition-all"
          style={{ background: "rgba(52,211,153,0.06)" }}
          data-testid="button-refresh-updates"
          aria-label="Refresh updates"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Fetching bar */}
      {isFetching && !isLoading && (
        <div className="h-0.5 mx-4 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-emerald-500 animate-[shimmer_1.2s_ease-in-out_infinite] rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, #34d399, transparent)", backgroundSize: "200% 100%" }} />
        </div>
      )}

      <div className="px-4 space-y-4 animate-in fade-in duration-400">

        {/* Category pills */}
        {!isLoading && categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  activeCategory === cat
                    ? "bg-emerald-700 text-white border-emerald-600"
                    : "text-emerald-600 border-emerald-900/50 hover:border-emerald-700"
                }`}
                style={activeCategory === cat ? {} : { background: "rgba(255,255,255,0.04)" }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-emerald-900/40"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-full h-44 animate-pulse" style={{ background: "rgba(52,211,153,0.06)" }} />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-20 rounded-full animate-pulse" style={{ background: "rgba(52,211,153,0.08)" }} />
                  <div className="h-5 w-4/5 rounded-full animate-pulse" style={{ background: "rgba(52,211,153,0.06)" }} />
                  <div className="h-3 w-full rounded-full animate-pulse" style={{ background: "rgba(52,211,153,0.05)" }} />
                  <div className="h-3 w-3/4 rounded-full animate-pulse" style={{ background: "rgba(52,211,153,0.04)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="rounded-2xl p-8 text-center border border-red-900/30"
            style={{ background: "rgba(239,68,68,0.05)" }}>
            <Wifi className="w-10 h-10 text-red-700 mx-auto mb-3" />
            <p className="text-red-400 font-semibold text-sm">Could not load updates</p>
            <p className="text-red-800 text-xs mt-1 mb-4">Check your internet connection</p>
            <button onClick={() => refetch()}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-red-300 border border-red-800/50 hover:border-red-600 transition-all"
              style={{ background: "rgba(239,68,68,0.08)" }}>
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: "rgba(52,211,153,0.08)", boxShadow: "0 0 32px rgba(52,211,153,0.06)" }}>
              <Sparkles className="w-9 h-9 text-emerald-700" />
            </div>
            <p className="text-emerald-500 font-semibold text-base">No updates available</p>
            <p className="text-emerald-800 text-sm mt-1">Check back soon for news and features</p>
            <p className="text-emerald-900 text-xs mt-1 font-arabic">إن شاء الله</p>
          </div>
        )}

        {/* Cards */}
        {!isLoading && !isError && filtered.map((item, i) => (
          <UpdateCard key={item.id || i} item={item} index={i} />
        ))}

        {!isLoading && !isError && filtered.length > 0 && (
          <p className="text-emerald-900 text-xs text-center pb-4">
            {filtered.length} update{filtered.length !== 1 ? "s" : ""} · Refreshes automatically
          </p>
        )}
      </div>
    </div>
  );
}

// ── Update Card ───────────────────────────────────────────────────────────────
function UpdateCard({ item, index }: { item: UpdateItem; index: number }) {
  const [imgError, setImgError] = useState(false);
  const cat = categoryStyle(item.category);
  const hasVideo = !!item.video_url?.trim();
  const hasLink  = !!item.target_link?.trim();

  const watchLabel = item.button_text?.trim() || "Watch";
  const openLabel  = hasVideo ? "Details" : (item.button_text?.trim() || "Open");

  function openUrl(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-emerald-900/40 transition-all duration-300 hover:border-emerald-700/40 active:scale-[0.99]"
      style={{
        background: "rgba(255,255,255,0.03)",
        animationDelay: `${index * 60}ms`,
        animation: "fadeSlideUp 0.4s ease both",
      }}
      data-testid={`update-card-${item.id || index}`}
    >
      {/* Image / thumbnail */}
      {item.image_url && !imgError ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/8" }}>
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(6,22,16,0.9) 100%)" }} />
          {/* Category badge over image */}
          {item.category && (
            <span
              className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${cat.text} ${cat.border}`}
              style={{ background: "rgba(6,22,16,0.7)", backdropFilter: "blur(4px)" }}
            >
              {item.category}
            </span>
          )}
          {/* Video play indicator */}
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          )}
        </div>
      ) : item.image_url && imgError ? (
        <div className="w-full flex items-center justify-center border-b border-emerald-900/30"
          style={{ aspectRatio: "16/8", background: "rgba(52,211,153,0.04)" }}>
          <ImageOff className="w-8 h-8 text-emerald-900" />
        </div>
      ) : null}

      {/* Card body */}
      <div className="p-4 space-y-2.5">
        {/* Category + date row (when no image) */}
        {(!item.image_url || imgError) && (
          <div className="flex items-center gap-2 flex-wrap">
            {item.category && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cat.text} ${cat.border}`}
                style={{ background: cat.bg }}
              >
                <Tag className="w-2.5 h-2.5 inline mr-1" />
                {item.category}
              </span>
            )}
            {item.created_at && (
              <span className="text-emerald-800 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />{formatDate(item.created_at)}
              </span>
            )}
          </div>
        )}

        {/* Date row when image present */}
        {item.image_url && !imgError && item.created_at && (
          <span className="text-emerald-800 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />{formatDate(item.created_at)}
          </span>
        )}

        {/* Title */}
        <h3 className="text-white font-bold text-base leading-snug">{item.title}</h3>

        {/* Description */}
        {item.description && (
          <p className="text-emerald-600 text-sm leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}

        {/* Action buttons */}
        {(hasVideo || hasLink) && (
          <div className="flex gap-2 pt-1">
            {hasVideo && (
              <button
                onClick={() => openUrl(item.video_url)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-200 transition-all active:scale-[0.97] hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }}
                data-testid={`button-watch-${item.id}`}
              >
                <Play className="w-3.5 h-3.5" />
                {watchLabel}
              </button>
            )}
            {hasLink && (
              <button
                onClick={() => openUrl(item.target_link)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
                  hasVideo
                    ? "text-emerald-400 border border-emerald-800/50 hover:border-emerald-600"
                    : "text-emerald-200"
                }`}
                style={hasVideo
                  ? { background: "rgba(52,211,153,0.06)" }
                  : { background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }
                }
                data-testid={`button-open-${item.id}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {openLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
