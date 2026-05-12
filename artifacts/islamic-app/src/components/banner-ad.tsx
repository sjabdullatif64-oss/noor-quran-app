/**
 * BannerAd — Native AdMob adaptive banner for Capacitor Android builds.
 *
 * AdMob App ID  : ca-app-pub-5050437827917011~3831002202  (AndroidManifest.xml)
 * Banner Ad Unit: ca-app-pub-5050437827917011/8806398221
 *
 * Flow:
 *  1. AdMob.initialize() called once (safe to call multiple times — ignores repeat calls)
 *  2. On mount: AdMob.showBanner() → native Android AdView at BOTTOM_CENTER
 *  3. BannerAdPluginEvents.Loaded → reserve BANNER_HEIGHT_PX so content clears the native view
 *  4. On unmount: AdMob.removeBanner() removes the native View cleanly
 *
 * In browser / non-Capacitor: renders nothing, zero layout impact.
 *
 * ADAPTIVE_BANNER automatically sizes itself based on device width (typically 50–90 dp).
 * We reserve 60 dp as a safe default — tall enough for most phones, avoids layout jumps.
 */

import { useEffect, useRef, useState } from "react";
import { isNative } from "@/lib/capacitor";
import type { PluginListenerHandle } from "@capacitor/core";
import type { BannerAdOptions } from "@capacitor-community/admob";

// ── Constants ─────────────────────────────────────────────────────────────────
const BANNER_AD_UNIT   = "ca-app-pub-5050437827917011/8806398221";

/**
 * Spacer height reserved when an ADAPTIVE_BANNER is active.
 * ADAPTIVE_BANNER on a 360 dp wide phone is ~60 dp; 60 px is a safe reserve.
 */
const BANNER_HEIGHT_PX = 60;

// ── Props ─────────────────────────────────────────────────────────────────────
export interface BannerAdProps {
  /**
   * "fixed-bottom" — native banner anchored at screen bottom.
   *   A spacer div is injected so scrollable content never scrolls under the ad.
   * "inline"       — same native overlay (Capacitor doesn't support mid-page banners),
   *   but space is reserved inline in the document flow.
   */
  placement?: "fixed-bottom" | "inline";
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BannerAd({ placement = "fixed-bottom", className = "" }: BannerAdProps) {
  const [adReady, setAdReady] = useState(false);
  const listeners = useRef<PluginListenerHandle[]>([]);
  const mounted   = useRef(true);
  const adShown   = useRef(false);

  useEffect(() => {
    mounted.current  = true;
    adShown.current  = false;

    if (!isNative()) return;

    async function initBanner() {
      try {
        const {
          AdMob,
          BannerAdSize,
          BannerAdPosition,
          BannerAdPluginEvents,
        } = await import("@capacitor-community/admob");

        // Initialize AdMob SDK — safe to call multiple times (subsequent calls are no-ops)
        await AdMob.initialize({}).catch(() => { /* already initialized */ });

        // Subscribe to banner events BEFORE calling showBanner to avoid race conditions
        const onLoaded = await AdMob.addListener(
          BannerAdPluginEvents.Loaded,
          () => { if (mounted.current) setAdReady(true); }
        );

        const onFailed = await AdMob.addListener(
          BannerAdPluginEvents.FailedToLoad,
          () => { if (mounted.current) setAdReady(false); }
        );

        listeners.current = [onLoaded, onFailed];

        // ADAPTIVE_BANNER adjusts its height based on device screen width
        const options: BannerAdOptions = {
          adId:     BANNER_AD_UNIT,
          adSize:   BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin:   0,
          isTesting: false,
        };

        await AdMob.showBanner(options);
        adShown.current = true;
      } catch {
        // AdMob unavailable or request failed — no layout impact
        if (mounted.current) setAdReady(false);
      }
    }

    initBanner();

    return () => {
      mounted.current = false;

      listeners.current.forEach((h) => h.remove().catch(() => {}));
      listeners.current = [];

      if (adShown.current) {
        import("@capacitor-community/admob")
          .then(({ AdMob }) => AdMob.removeBanner())
          .catch(() => {});
        adShown.current = false;
      }
    };
  }, []);

  // Nothing to render in browser, or while waiting for the ad to load
  if (!isNative() || !adReady) return null;

  if (placement === "fixed-bottom") {
    return (
      <>
        {/* Spacer — pushes scrollable content above the native AdView */}
        <div style={{ height: BANNER_HEIGHT_PX }} aria-hidden="true" />
        {/* Invisible marker useful for layout debugging */}
        <div
          id="admob-banner-bottom"
          className={`fixed bottom-0 left-0 right-0 z-40 pointer-events-none ${className}`}
          style={{ height: BANNER_HEIGHT_PX }}
          data-admob-unit={BANNER_AD_UNIT}
          aria-hidden="true"
        />
      </>
    );
  }

  // "inline" — space reserved in document flow; native overlay still appears at bottom
  return (
    <div
      id="admob-banner-inline"
      className={`w-full ${className}`}
      style={{ height: BANNER_HEIGHT_PX, minHeight: BANNER_HEIGHT_PX }}
      data-admob-unit={BANNER_AD_UNIT}
      aria-hidden="true"
    />
  );
}
