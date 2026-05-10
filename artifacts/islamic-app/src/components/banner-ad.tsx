/**
 * BannerAd — AdMob banner for WebView-packaged Android builds.
 *
 * How it works:
 *  1. Capacitor + @capacitor-community/admob  →  calls AdMob.showBanner()
 *  2. Custom Android WebView bridge           →  calls window.Android.showBanner()
 *  3. Plain browser / iOS PWA                 →  silent no-op; placeholder collapses
 *
 * The native layer renders the real ad as a native View overlaid on the WebView,
 * positioned to match this reserved space.  The <div> here only holds the layout
 * height so page content never slides behind the ad.
 *
 * AdMob App ID  : ca-app-pub-5050437827917011~3831002202
 * Banner Ad Unit: ca-app-pub-5050437827917011/3064265739
 */

import { useEffect, useRef, useState } from "react";

// ─── Types for native bridge interfaces ──────────────────────────────────────
declare global {
  interface Window {
    /** Custom Android WebView JavascriptInterface */
    Android?: {
      showBanner: (adUnitId: string, position: string) => void;
      hideBanner: () => void;
    };
    /** Capacitor plugin bridge (populated by @capacitor-community/admob) */
    Capacitor?: {
      Plugins?: {
        AdMob?: {
          showBanner: (opts: {
            adId: string;
            adSize: string;
            position: string;
            isTesting: boolean;
          }) => Promise<void>;
          hideBanner: () => Promise<void>;
        };
      };
    };
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BANNER_AD_UNIT_ID = "ca-app-pub-5050437827917011/3064265739";

/** Standard AdMob banner height (dp / px) */
const BANNER_HEIGHT_PX = 50;

export interface BannerAdProps {
  /**
   * "fixed-bottom" — sticks to the bottom of the viewport (Home, More).
   * "inline"       — flows inside the content column (Timer / future screens).
   */
  placement?: "fixed-bottom" | "inline";

  /**
   * Extra className applied to the wrapper div.
   * Useful for adding margin/padding on specific screens.
   */
  className?: string;
}

type AdState = "loading" | "native" | "hidden";

export function BannerAd({ placement = "fixed-bottom", className = "" }: BannerAdProps) {
  const [adState, setAdState] = useState<AdState>("loading");
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // ── 1. Capacitor AdMob plugin ──────────────────────────────────────────
      const admob = window.Capacitor?.Plugins?.AdMob;
      if (admob?.showBanner) {
        try {
          await admob.showBanner({
            adId: BANNER_AD_UNIT_ID,
            adSize: "BANNER",
            position: placement === "fixed-bottom" ? "BOTTOM_CENTER" : "BOTTOM_CENTER",
            isTesting: false,
          });
          if (!cancelled) setAdState("native");
          cleanupRef.current = () => admob.hideBanner?.();
          return;
        } catch {
          // fall through to next strategy
        }
      }

      // ── 2. Custom Android WebView JavaScript interface ────────────────────
      if (window.Android?.showBanner) {
        try {
          window.Android.showBanner(BANNER_AD_UNIT_ID, placement);
          if (!cancelled) setAdState("native");
          cleanupRef.current = () => window.Android?.hideBanner?.();
          return;
        } catch {
          // fall through
        }
      }

      // ── 3. Plain browser — hide gracefully ────────────────────────────────
      if (!cancelled) setAdState("hidden");
    }

    init();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [placement]);

  // Plain browser or unsupported environment — render nothing, no layout impact.
  if (adState === "hidden" || adState === "loading") return null;

  // adState === "native": space is confirmed reserved; real ad overlays from native layer.
  const height = BANNER_HEIGHT_PX;

  if (placement === "fixed-bottom") {
    return (
      <>
        {/* Spacer prevents content from sliding under the native-overlay banner */}
        <div style={{ height }} aria-hidden="true" />
        {/* Anchor div — native layer reads `data-admob-unit` and positions its View here */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-40 pointer-events-none ${className}`}
          style={{ height }}
          id="admob-banner-bottom"
          aria-hidden="true"
          data-admob-unit={BANNER_AD_UNIT_ID}
          data-admob-placement="fixed-bottom"
        />
      </>
    );
  }

  // inline placement — flows naturally inside scroll container
  return (
    <div
      className={`w-full ${className}`}
      style={{ height, minHeight: height }}
      id="admob-banner-inline"
      aria-hidden="true"
      data-admob-unit={BANNER_AD_UNIT_ID}
      data-admob-placement="inline"
    />
  );
}
