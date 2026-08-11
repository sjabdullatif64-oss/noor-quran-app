import { useRef, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft,
  RefreshCw,
  Play,
  ExternalLink,
  Sparkles,
  Clock,
  Tag,
  ImageOff,
  Wifi,
} from "lucide-react";
import {
  type UpdateItem,
  resolveImageUrl,
  fetchUpdates,
} from "@/lib/updates-data";
import { openUrl as openExternalUrl } from "@/lib/capacitor";

function useSheetUpdates() {
  return useQuery({
    queryKey: ["updates"],
    queryFn: fetchUpdates,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 3 * 60_000,
    retry: 2,
  });
}

function categoryStyle(category: string) {
  const value = category?.toLowerCase() ?? "";
  if (
    value.includes("quran") ||
    value.includes("prayer") ||
    value.includes("event") ||
    value.includes("feature") ||
    value.includes("update")
  ) {
    return {
      bg: "bg-primary/15",
      text: "text-foreground",
      border: "border-border",
    };
  }
  return { bg: "bg-muted", text: "text-foreground", border: "border-border" };
}

function formatDate(value: string): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function CardImage({
  url,
  title,
  hasVideo,
}: {
  url: string;
  title: string;
  hasVideo: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const resolved = resolveImageUrl(url);

  useEffect(() => {
    setStatus("loading");
  }, [resolved]);

  if (status === "error") {
    return (
      <div
        className="flex w-full flex-col items-center justify-center gap-2 border-b border-border bg-card"
        style={{ aspectRatio: "16/8" }}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/8" }}>
      {status === "loading" && <div className="absolute inset-0 animate-pulse bg-muted" />}
      <img
        src={resolved}
        alt={title}
        className="h-full w-full object-cover"
        style={{ opacity: status === "ok" ? 1 : 0, transition: "opacity 0.3s" }}
        onLoad={() => setStatus("ok")}
        onError={() => setStatus("error")}
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
      {hasVideo && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          >
            <Play className="ml-0.5 h-5 w-5 text-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateCard({ item, index }: { item: UpdateItem; index: number }) {
  const category = categoryStyle(item.category);
  const hasVideo = Boolean(item.video_url?.trim());
  const hasLink = Boolean(item.target_link?.trim());
  const hasImage = Boolean(item.image_url?.trim());
  const watchLabel = item.button_text?.trim() || "Watch";
  const openLabel = hasVideo ? "Details" : item.button_text?.trim() || "Open";

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-border active:scale-[0.99]"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: "fadeSlideUp 0.4s ease both",
      }}
      data-testid={`update-card-${item.id || index}`}
    >
      {hasImage && item.category && (
        <div className="relative">
          <CardImage url={item.image_url} title={item.title} hasVideo={hasVideo} />
          <span
            className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-semibold ${category.text} ${category.border} ${category.bg}`}
            style={{ backdropFilter: "blur(4px)" }}
          >
            {item.category}
          </span>
        </div>
      )}
      {hasImage && !item.category && (
        <CardImage url={item.image_url} title={item.title} hasVideo={hasVideo} />
      )}

      <div className="space-y-2.5 p-4">
        {!hasImage && (
          <div className="flex flex-wrap items-center gap-2">
            {item.category && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${category.text} ${category.border} ${category.bg}`}
              >
                <Tag className="mr-1 inline h-2.5 w-2.5" />
                {item.category}
              </span>
            )}
            {item.created_at && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(item.created_at)}
              </span>
            )}
          </div>
        )}

        {hasImage && item.created_at && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(item.created_at)}
          </span>
        )}

        <h3 className="select-none text-base font-bold leading-snug text-foreground">
          {item.title}
        </h3>

        {item.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}

        {(hasVideo || hasLink) && (
          <div className="flex gap-2 pt-1">
            {hasVideo && (
              <button
                onClick={() => void openExternalUrl(item.video_url)}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.97]"
                data-testid={`button-watch-${item.id}`}
              >
                <Play className="h-3.5 w-3.5" />
                {watchLabel}
              </button>
            )}
            {hasLink && (
              <button
                onClick={() => void openExternalUrl(item.target_link)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] ${
                  hasVideo
                    ? "border border-border bg-card text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
                data-testid={`button-open-${item.id}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {openLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Updates() {
  const {
    data: items = [],
    isLoading,
    isError,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useSheetUpdates();

  const categories = ["All", ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))];
  const [activeCategory, setActiveCategory] = useState("All");
  const filtered =
    activeCategory === "All"
      ? items
      : items.filter((item) => item.category === activeCategory);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const [pullY, setPullY] = useState(0);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    if ((containerRef.current?.scrollTop ?? 0) === 0) {
      startYRef.current = event.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    if ((containerRef.current?.scrollTop ?? 1) > 0) return;
    const distance = event.touches[0].clientY - startYRef.current;
    if (distance > 0) setPullY(Math.min(distance * 0.45, 64));
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pullY >= 48) void refetch();
    setPullY(0);
  }, [pullY, refetch]);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      ref={containerRef}
      className="min-h-screen overflow-y-auto pb-28 md:pb-10"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-300"
        style={{ height: pullY > 0 ? `${pullY}px` : 0 }}
      >
        <RefreshCw
          className="h-5 w-5 text-primary"
          style={{ transform: `rotate(${(pullY / 64) * 180}deg)` }}
        />
      </div>

      <div className="flex items-center gap-3 px-5 pb-4 pt-6">
        <Link
          href="/more"
          className="text-muted-foreground transition-colors hover:text-primary"
          data-testid="link-back-more"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-bold text-primary">Updates</h1>
          {lastUpdated && !isLoading && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Refreshed at {lastUpdated}
            </p>
          )}
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-primary transition-all hover:border-emerald-600 hover:text-primary"
          style={{ background: "rgba(52,211,153,0.06)" }}
          data-testid="button-refresh-updates"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isFetching && !isLoading && (
        <div className="mx-4 mb-2 h-0.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent, #34d399, transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.2s ease-in-out infinite",
            }}
          />
        </div>
      )}

      <div className="space-y-4 px-4 animate-in fade-in duration-400">
        {!isLoading && categories.length > 1 && (
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeCategory === category
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="h-44 w-full animate-pulse bg-primary/10" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-20 animate-pulse rounded-full bg-primary/15" />
                  <div className="h-5 w-4/5 animate-pulse rounded-full bg-primary/10" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-primary/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
            <Wifi className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <p className="text-sm font-semibold text-destructive">Could not load updates</p>
            <p className="mt-1 mb-4 text-xs text-destructive">Check your internet connection</p>
            <button
              onClick={() => void refetch()}
              className="rounded-xl border border-destructive/50 bg-destructive/10 px-5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20"
            >
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl"
              style={{ background: "rgba(52,211,153,0.08)" }}
            >
              <Sparkles className="h-9 w-9 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-primary">No updates available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back soon for news and features
            </p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          filtered.map((item, index) => <UpdateCard key={item.id || index} item={item} index={index} />)}

        {!isLoading && !isError && filtered.length > 0 && (
          <p className="pb-4 text-center text-xs text-muted-foreground">
            {filtered.length} update{filtered.length !== 1 ? "s" : ""} · Refreshes automatically
          </p>
        )}
      </div>
    </div>
  );
}