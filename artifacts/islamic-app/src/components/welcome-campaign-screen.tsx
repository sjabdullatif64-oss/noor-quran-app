import { ArrowUpRight, Clock3, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { openUrl } from "@/lib/capacitor";
import {
  getWelcomeCampaignDurationSeconds,
  getWelcomeCampaignMedia,
  isValidWelcomeCampaignUrl,
  type WelcomeCampaign,
} from "@/lib/welcome-campaign";
import { cn } from "@/lib/utils";
import { WelcomeCampaignMedia } from "@/components/welcome-campaign-media";

const MEDIA_PREPARATION_TIMEOUT_MS = 1500;

export interface WelcomeCampaignScreenProps {
  campaign: WelcomeCampaign;
  onSkip: () => void;
  onOpenUrl: (url: string) => void;
  className?: string;
}

export function WelcomeCampaignScreen({
  campaign,
  onSkip,
  onOpenUrl,
  className,
}: WelcomeCampaignScreenProps) {
  const durationSeconds = useMemo(
    () => getWelcomeCampaignDurationSeconds(campaign.durationSeconds),
    [campaign.durationSeconds],
  );
  const mediaKind = useMemo(
    () => getWelcomeCampaignMedia(campaign).kind,
    [campaign],
  );
  const [mediaReady, setMediaReady] = useState(mediaKind === "none");
  const [mediaError, setMediaError] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const finishedRef = useRef(false);
  const skipRef = useRef(onSkip);
  const openUrlRef = useRef(onOpenUrl);

  skipRef.current = onSkip;
  openUrlRef.current = onOpenUrl;

  useEffect(() => {
    setMediaReady(mediaKind === "none");
    setMediaError(false);
    setElapsedMs(0);
    finishedRef.current = false;
  }, [campaign.id, mediaKind]);

  useEffect(() => {
    if (mediaReady) return;
    const timeoutId = window.setTimeout(() => setMediaReady(true), MEDIA_PREPARATION_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [mediaReady]);

  const handleSkip = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    skipRef.current();
  }, []);

  useEffect(() => {
    if (!mediaReady) return;

    const durationMs = durationSeconds * 1000;
    const startedAt = performance.now();
    const intervalId = window.setInterval(() => {
      const nextElapsed = Math.min(durationMs, performance.now() - startedAt);
      setElapsedMs(nextElapsed);

      if (nextElapsed >= durationMs) {
        window.clearInterval(intervalId);
        handleSkip();
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [campaign.id, durationSeconds, handleSkip, mediaReady]);

  const progress = Math.min(100, (elapsedMs / (durationSeconds * 1000)) * 100);
  const secondsRemaining = Math.max(
    0,
    Math.ceil((durationSeconds * 1000 - elapsedMs) / 1000),
  );
  const callToActionText = campaign.buttonText?.trim() || "Open";
  const campaignUrl = isValidWelcomeCampaignUrl(campaign.url) ? campaign.url.trim() : null;
  const hasCallToAction = Boolean(campaignUrl);

  const handleOpenUrl = useCallback(() => {
    const url = campaignUrl;
    if (!url) return;

    void openUrl(url);
    openUrlRef.current(url);
  }, [campaign.url]);

  return (
    <section
      className={cn(
        "relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 md:py-12",
        className,
      )}
      aria-label="Welcome campaign"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,hsl(var(--primary)/.18),transparent_35%),radial-gradient(circle_at_90%_85%,hsl(var(--accent)/.2),transparent_30%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-px -translate-x-1/2 bg-gradient-to-b from-primary/30 to-transparent" />

      <article className="relative w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-4 flex items-center justify-between px-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            Noor Quran
          </span>
          <span className="text-[10px] tracking-[0.14em]">A quiet moment</span>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-primary/20 bg-card shadow-2xl shadow-primary/10 md:grid md:grid-cols-[1.06fr_.94fr]">
          <div className="relative overflow-hidden bg-primary/10">
            <WelcomeCampaignMedia
              campaign={campaign}
              onReady={() => setMediaReady(true)}
              onError={() => {
                setMediaReady(true);
                setMediaError(true);
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-transparent" />
            {mediaError && (
              <span className="absolute bottom-4 left-4 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
                Continuing without media
              </span>
            )}
          </div>

          <div className="flex flex-col justify-between p-6 sm:p-8 md:p-10">
            <div>
              <div className="mb-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span aria-live="polite">
                    Closes in {secondsRemaining}s
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-border/80 px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Skip welcome campaign"
                >
                  Skip
                  <X className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" aria-hidden="true" />
                </button>
              </div>

              <div className="mb-7 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Begin with Noor
              </p>
              <h1 className="max-w-md font-serif text-3xl leading-[1.12] text-card-foreground sm:text-4xl">
                {campaign.title}
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
                {campaign.description}
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              {hasCallToAction && (
                <Button
                  type="button"
                  onClick={handleOpenUrl}
                  className="min-h-12 rounded-full bg-primary px-6 text-primary-foreground shadow-lg shadow-primary/15"
                >
                  {callToActionText}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              {hasCallToAction && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  className="min-h-12 rounded-full px-5 text-muted-foreground hover:text-foreground"
                >
                  Continue to Noor Quran
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}