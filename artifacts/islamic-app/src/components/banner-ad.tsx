/**
 * BannerAd — Native AdMob banner for Capacitor Android builds.
 *
 * Uses @capacitor-community/admob for a real native Android AdView that
 * overlays on top of the WebView — no browser/iframe ad, no PWA limitation.
 *
 * AdMob App ID  : ca-app-pub-5050437827917011~3831002202  (AndroidManifest.xml)
 * Banner Ad Unit: ca-app-pub-5050437827917011/3064265739
 *
 * Flow:
 *  1. AdMob.initialize() called once at app startup (native-init.ts)
 *  2. On mount: AdMob.showBanner() → native Android AdView renders at BOTTOM_CENTER
 *  3. Plugin fires BannerAdPluginEvents.Loaded → component reserves 50dp height
 *  4. On unmount: AdMob.removeBanner() removes the native View cleanly
 *
 * In browser / non-Capacitor env: renders nothing, zero layout impact.
 */

import { useEffect, useRef, useState } from "react";
import { isNative } from "@/lib/capacitor";
import type { PluginListenerHandle } from "@capacitor/core";

// BannerAdOptions type — only used in the dynamic import path
import type { BannerAdOptions } from "@capacitor-community/admob";

// ── Constants ─────────────────────────────────────────────────────────────────
const BANNER_AD_UNIT = "ca-app-pub-5050437827917011/3064265739";

/** Standard AdMob banner height in dp (matches BANNER size = 320×50) */
const BANNER_HEIGHT_PX = 50;

// ── Props ─────────────────────────────────────────────────────────────────────
export interface BannerAdProps {
  /**
   * "fixed-bottom" — the native banner is anchored at the bottom of the screen.
   *   A 50dp spacer is injected so content never scrolls under the ad.
   * "inline" — also shows at bottom (Capacitor native ads are always full-width
   *   overlays; inline positions are not supported natively). Space is reserved.
   */
  placement?: "fixed-bottom" | "inline";
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function BannerAd({ placement = "fixed-bottom", className = "" }: BannerAdProps) {
  const [adReady, setAdReady] = useState(false);
  const listeners = useRef<PluginListenerHandle[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Only run inside the native Capacitor APK shell
    if (!isNative()) return;

    let adShown = false;

    async function initBanner() {
      try {
        const {
          AdMob,
          BannerAdSize,
          BannerAdPosition,
          BannerAdPluginEvents,
        } = await import("@capacitor-community/admob");

        // ── Subscribe to events before calling showBanner ────────────────────
        const loadedHandle = await AdMob.addListener(
          BannerAdPluginEvents.Loaded,
          () => {
            if (mounted.current) setAdReady(true);
          }
        );

        const failedHandle = await AdMob.addListener(
          BannerAdPluginEvents.FailedToLoad,
          (info) => {
            console.warn("[AdMob] Banner failed to load:", info);
            if (mounted.current) setAdReady(false);
          }
        );

        listeners.current = [loadedHandle, failedHandle];

        // ── Show native banner ────────────────────────────────────────────────
        const options: BannerAdOptions = {
          adId: BANNER_AD_UNIT,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false,
        };

        await AdMob.showBanner(options);
        adShown = true;
      } catch (err) {
        // AdMob not available or ad request failed — no layout impact
        console.warn("[AdMob] showBanner error:", err);
        if (mounted.current) setAdReady(false);
      }
    }

    initBanner();

    return () => {
      mounted.current = false;

      // Remove event listeners
      listeners.current.forEach((h) => h.remove().catch(() => {}));
      listeners.current = [];

      // Remove the native AdView from the screen
      if (adShown) {
        import("@capacitor-community/admob")
          .then(({ AdMob }) => AdMob.removeBanner())
          .catch(() => {});
      }
    };
  }, []);

  // Not in native app, or ad hasn't loaded yet — no space reserved
  if (!isNative() || !adReady) return null;

  // Ad is live — reserve 50dp so page content doesn't hide under the native overlay
  if (placement === "fixed-bottom") {
    return (
      <>
        {/* Pushes bottom content above the native AdView */}
        <div style={{ height: BANNER_HEIGHT_PX }} aria-hidden="true" />
        {/* Marker div — useful for future positioning debugging */}
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

  // "inline" — bottom-center native banner, space reserved inline
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
