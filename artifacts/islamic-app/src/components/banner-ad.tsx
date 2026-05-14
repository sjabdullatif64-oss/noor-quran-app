/**
 * BannerAd — Native AdMob adaptive banner for Capacitor Android builds.
 *
 * AdMob App ID  : ca-app-pub-5050437827917011~3831002202  (AndroidManifest.xml)
 * Banner Ad Unit: ca-app-pub-5050437827917011/8806398221
 *
 * Architecture:
 *  - The banner is shown ONCE at app start and NEVER removed during navigation.
 *    Calling removeBanner() + showBanner() on every route change is the #1 cause
 *    of blank/flickering banners on real devices. Instead we hide/show the spacer
 *    and call AdMob.hideBanner() / AdMob.resumeBanner() which is lightweight.
 *  - A module-level singleton prevents double-init if React ever re-mounts.
 *  - All events are logged with [AdMob] prefix for real-device debugging via logcat.
 */

import { useEffect, useState } from "react";
import { isNative } from "@/lib/capacitor";

const BANNER_AD_UNIT   = "ca-app-pub-5050437827917011/8806398221";
const BANNER_HEIGHT_PX = 60;

// ── Module-level singleton — survives React unmount/remount ──────────────────
let bannerState: "idle" | "loading" | "showing" | "hidden" | "failed" = "idle";
let stateListeners: Array<(s: typeof bannerState) => void> = [];

function setBannerState(s: typeof bannerState) {
  bannerState = s;
  stateListeners.forEach((fn) => fn(s));
}

function log(msg: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[AdMob Banner] ${msg}`, data);
  } else {
    console.log(`[AdMob Banner] ${msg}`);
  }
}

// Called once at startup from native-init.ts (or on first mount as fallback)
export async function startBanner(): Promise<void> {
  if (!isNative()) return;
  if (bannerState !== "idle") {
    log(`startBanner() skipped — already in state: ${bannerState}`);
    return;
  }

  setBannerState("loading");
  log("Starting banner ad…");

  try {
    const {
      AdMob,
      BannerAdSize,
      BannerAdPosition,
      BannerAdPluginEvents,
    } = await import("@capacitor-community/admob");

    await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
      log("Loaded ✓");
      setBannerState("showing");
    });

    await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (err) => {
      log("FailedToLoad ✗", err);
      setBannerState("failed");
      // Retry after 60 s — common when there's no fill
      setTimeout(() => {
        if (bannerState === "failed") {
          log("Retrying after fill failure…");
          setBannerState("idle");
          startBanner();
        }
      }, 60_000);
    });

    await AdMob.addListener(BannerAdPluginEvents.AdImpression, () => {
      log("AdImpression");
    });

    await AdMob.addListener(BannerAdPluginEvents.Opened, () => {
      log("Opened (user tapped)");
    });

    await AdMob.addListener(BannerAdPluginEvents.Closed, () => {
      log("Closed");
    });

    await AdMob.showBanner({
      adId:      BANNER_AD_UNIT,
      adSize:    BannerAdSize.ADAPTIVE_BANNER,
      position:  BannerAdPosition.BOTTOM_CENTER,
      margin:    0,
      isTesting: false,
    });

    log("showBanner() called — waiting for Loaded event");
  } catch (err) {
    log("showBanner() threw", err);
    setBannerState("failed");
  }
}

// Called by Layout when entering a no-ad route (Quran reader)
export async function hideBanner(): Promise<void> {
  if (!isNative() || bannerState !== "showing") return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.hideBanner();
    setBannerState("hidden");
    log("hideBanner() — ad hidden for Quran screen");
  } catch (err) {
    log("hideBanner() threw", err);
  }
}

// Called by Layout when leaving a no-ad route
export async function resumeBanner(): Promise<void> {
  if (!isNative() || bannerState !== "hidden") return;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.resumeBanner();
    setBannerState("showing");
    log("resumeBanner() — ad visible again");
  } catch (err) {
    log("resumeBanner() threw", err);
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface BannerAdProps {
  placement?: "fixed-bottom" | "inline";
  className?: string;
}

// ── Component — only renders the spacer; ad itself is a native overlay ────────
export function BannerAd({ placement = "fixed-bottom", className = "" }: BannerAdProps) {
  const [currentState, setCurrentState] = useState<typeof bannerState>(bannerState);

  useEffect(() => {
    // Subscribe to singleton state changes
    stateListeners.push(setCurrentState);

    // If banner hasn't been started yet (no native-init call), start it now
    if (bannerState === "idle") {
      startBanner();
    }

    return () => {
      stateListeners = stateListeners.filter((fn) => fn !== setCurrentState);
      // NOTE: do NOT call removeBanner() here — the banner must persist across
      // React remounts. The singleton keeps it alive.
    };
  }, []);

  // Reserve the spacer always (even while loading) to prevent content jump
  // when the ad finally renders. Only hide it when the banner is intentionally
  // hidden (Quran screen) or failed to load.
  const showSpacer = isNative() && (currentState === "loading" || currentState === "showing");

  if (!showSpacer) return null;

  if (placement === "fixed-bottom") {
    return (
      <>
        <div style={{ height: BANNER_HEIGHT_PX }} aria-hidden="true" />
        <div
          id="admob-banner-bottom"
          className={`fixed bottom-0 left-0 right-0 z-40 pointer-events-none ${className}`}
          style={{ height: BANNER_HEIGHT_PX }}
          aria-hidden="true"
        />
      </>
    );
  }

  return (
    <div
      id="admob-banner-inline"
      className={`w-full ${className}`}
      style={{ height: BANNER_HEIGHT_PX, minHeight: BANNER_HEIGHT_PX }}
      aria-hidden="true"
    />
  );
}
