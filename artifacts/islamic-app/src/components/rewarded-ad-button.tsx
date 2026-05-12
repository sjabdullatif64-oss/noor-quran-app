/**
 * RewardedAdButton — "Support Noor Quran" button with native AdMob Rewarded Ad.
 *
 * AdMob App ID   : ca-app-pub-5050437827917011~3831002202  (AndroidManifest.xml)
 * Rewarded Unit  : ca-app-pub-5050437827917011/8806398221
 *
 * Flow (native APK):
 *  1. User taps button → prepareRewardVideoAd() starts loading
 *  2. Ad loads (Loaded event) → showRewardVideoAd() presents full-screen ad
 *  3. User earns reward (Rewarded event) → wasRewarded = true, thank-you toast
 *  4. Ad closes (Dismissed event) → reset to idle (toast already shown if rewarded)
 *                                   OR show fallback if user skipped without reward
 *  5. Any load/show failure → beautiful fallback screen (never a blank or crash)
 *
 * In browser / non-Capacitor: shows the thank-you toast directly (no-op ad).
 *
 * Bug fixes in this version vs previous:
 *  - wasRewarded ref prevents double toast (Rewarded + Dismissed both fired)
 *  - clearListeners() never called INSIDE an event handler (causes handle to
 *    remove itself while executing, which is unsafe in some native bridges)
 *  - mountedRef correctly initialised once and cleared only on unmount
 *  - 30-second load timeout → fallback if ad never responds
 *
 * Google Play policy compliance:
 *  - Fully voluntary — user must tap to start
 *  - Never gate core functionality behind watching an ad
 */

import { useState, useRef, useEffect } from "react";
import { Heart, Loader2, X } from "lucide-react";
import { isNative } from "@/lib/capacitor";
import { useToast } from "@/hooks/use-toast";
import type { PluginListenerHandle } from "@capacitor/core";

// ── Constants ─────────────────────────────────────────────────────────────────
const REWARDED_AD_UNIT  = "ca-app-pub-5050437827917011/8806398221";
const JAZAK_TITLE       = "JazakAllah Khair 🌙";
const JAZAK_MSG         = "JazakAllah for supporting Noor Quran 🌙";
const LOAD_TIMEOUT_MS   = 30_000; // give the ad network 30 s to respond

// ── Types ─────────────────────────────────────────────────────────────────────
type AdState = "idle" | "loading" | "showing" | "done" | "fallback";

// ── Fallback Screen ────────────────────────────────────────────────────────────
function FallbackScreen({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.28s ease",
      }}
      onClick={handleClose}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden text-center"
        style={{
          background: "linear-gradient(160deg, #0d2b1a 0%, #0a1f14 50%, #071a0e 100%)",
          border: "1px solid rgba(26,92,56,0.6)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(26,92,56,0.18)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.88) translateY(24px)",
          transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-emerald-600 hover:text-emerald-400 transition-colors"
          style={{ background: "rgba(26,92,56,0.25)" }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Decorative top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, #1a5c38, transparent)" }}
        />

        <div className="px-7 pt-10 pb-8">
          {/* Crescent & star motif */}
          <div className="flex justify-center mb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{
                background: "radial-gradient(circle, rgba(26,92,56,0.35) 0%, rgba(26,92,56,0.08) 100%)",
                border: "1.5px solid rgba(26,92,56,0.5)",
                boxShadow: "0 0 32px rgba(26,92,56,0.25)",
              }}
            >
              🤍
            </div>
          </div>

          {/* Title */}
          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: "#e8f5ee", letterSpacing: "-0.02em" }}
          >
            MashaAllah 🤍
          </h2>

          {/* Decorative divider */}
          <div className="flex items-center gap-2 justify-center my-4">
            <div className="h-px flex-1" style={{ background: "rgba(26,92,56,0.4)" }} />
            <span className="text-emerald-700 text-xs">✦</span>
            <div className="h-px flex-1" style={{ background: "rgba(26,92,56,0.4)" }} />
          </div>

          {/* Subtitle */}
          <p
            className="text-base font-semibold mb-1"
            style={{ color: "rgba(134,239,172,0.7)" }}
          >
            New rewards coming soon
          </p>

          {/* Message */}
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(200,230,215,0.75)" }}
          >
            Thank you for supporting Noor Quran.
            <br />
            Your kindness helps this Islamic app grow for everyone.
          </p>

          {/* Quranic touch */}
          <p
            className="mt-4 text-xs"
            style={{ color: "rgba(52,211,153,0.55)", fontStyle: "italic" }}
          >
            "And whoever does good — Allah is appreciative and Knowing." — Quran 2:158
          </p>

          {/* Close / Continue button */}
          <button
            onClick={handleClose}
            className="mt-7 w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #1a5c38 0%, #145230 100%)",
              boxShadow: "0 4px 24px rgba(26,92,56,0.35)",
            }}
          >
            Continue Reading 📖
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RewardedAdButton() {
  const [adState, setAdState] = useState<AdState>("idle");
  const { toast }             = useToast();

  // Lifecycle refs — never trigger re-renders
  const mountedRef    = useRef(true);
  const wasRewarded   = useRef(false);        // true once Rewarded event fires
  const listeners     = useRef<PluginListenerHandle[]>([]);
  const loadTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark unmounted on cleanup — prevents setState after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearLoadTimer();
      cleanupListeners();
    };
  }, []);

  function clearLoadTimer() {
    if (loadTimer.current) {
      clearTimeout(loadTimer.current);
      loadTimer.current = null;
    }
  }

  function cleanupListeners() {
    listeners.current.forEach((h) => h.remove().catch(() => {}));
    listeners.current = [];
  }

  function safeSetState(s: AdState) {
    if (mountedRef.current) setAdState(s);
  }

  function showFallback() {
    clearLoadTimer();
    safeSetState("fallback");
  }

  function closeFallback() {
    safeSetState("idle");
  }

  async function handleSupport() {
    if (adState !== "idle") return;

    // ── Browser / web fallback — show thank-you toast directly ──────────────
    if (!isNative()) {
      toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
      safeSetState("done");
      setTimeout(() => safeSetState("idle"), 4000);
      return;
    }

    // ── Native APK — load and show rewarded ad ───────────────────────────────
    wasRewarded.current = false;
    safeSetState("loading");

    try {
      const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob");

      // Safe re-init guard — no-ops if AdMob is already initialised
      await AdMob.initialize({}).catch(() => {});

      // Register ALL listeners BEFORE calling prepareRewardVideoAd so we
      // never miss an event that fires immediately after load starts.
      const onLoaded = await AdMob.addListener(
        RewardAdPluginEvents.Loaded,
        async () => {
          clearLoadTimer();
          if (!mountedRef.current) return;
          safeSetState("showing");
          try {
            await AdMob.showRewardVideoAd();
          } catch {
            showFallback();
          }
        }
      );

      // Rewarded: user watched enough to earn the reward
      const onRewarded = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        () => {
          wasRewarded.current = true;
          if (!mountedRef.current) return;
          toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
          safeSetState("done");
        }
      );

      // Dismissed: ad closed (fires after Rewarded on success, or alone on skip)
      // NOTE: never call cleanupListeners() inside a listener callback — removing
      // a handle while its own event is still propagating is unsafe in some native
      // bridges. Let the useEffect cleanup handle it on unmount.
      const onDismissed = await AdMob.addListener(
        RewardAdPluginEvents.Dismissed,
        () => {
          if (!mountedRef.current) return;
          if (wasRewarded.current) {
            // Toast already shown by onRewarded — just reset after a delay
            setTimeout(() => safeSetState("idle"), 4000);
          } else {
            // User skipped the ad — show a brief thank-you anyway
            toast({ title: "JazakAllah 🌙", description: "Thanks for trying! Your support means the world." });
            safeSetState("done");
            setTimeout(() => safeSetState("idle"), 3000);
          }
        }
      );

      // FailedToShow: ad loaded but could not be presented (e.g., already showing)
      const onFailedToShow = await AdMob.addListener(
        RewardAdPluginEvents.FailedToShow,
        () => showFallback()
      );

      // FailedToLoad: no inventory or network issue
      const onFailedToLoad = await AdMob.addListener(
        RewardAdPluginEvents.FailedToLoad,
        () => showFallback()
      );

      listeners.current = [onLoaded, onRewarded, onDismissed, onFailedToShow, onFailedToLoad];

      // Safety net: if neither Loaded nor FailedToLoad fires within 30 s,
      // show fallback so the button doesn't stay "loading" indefinitely.
      // The timer is cleared in onLoaded (before showRewardVideoAd), so this
      // only fires when the ad network truly fails to respond.
      loadTimer.current = setTimeout(() => {
        if (mountedRef.current) showFallback();
      }, LOAD_TIMEOUT_MS);

      // Start loading the ad
      await AdMob.prepareRewardVideoAd({
        adId:      REWARDED_AD_UNIT,
        isTesting: false,
      });

    } catch {
      // Plugin unavailable or unexpected error
      showFallback();
    }
  }

  const isLoading = adState === "loading" || adState === "showing";
  const isDone    = adState === "done";

  return (
    <>
      {/* Fallback screen — shown when ad unavailable or fails */}
      {adState === "fallback" && <FallbackScreen onClose={closeFallback} />}

      <button
        onClick={handleSupport}
        disabled={isLoading || isDone}
        className="w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: isDone
            ? "linear-gradient(135deg, rgba(236,72,153,0.18) 0%, rgba(168,85,247,0.12) 100%)"
            : "linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(168,85,247,0.08) 100%)",
          borderColor: isDone ? "rgba(236,72,153,0.5)" : "rgba(236,72,153,0.3)",
          boxShadow: isDone ? "0 0 20px rgba(236,72,153,0.12)" : undefined,
        }}
        data-testid="button-support-noor-quran"
      >
        {/* Icon */}
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(236,72,153,0.18)" }}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
          ) : isDone ? (
            <span className="text-lg">🌙</span>
          ) : (
            <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
          )}
        </span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {isDone ? (
            <>
              <p className="text-white text-sm font-semibold">JazakAllah Khair 🌙</p>
              <p className="text-pink-600 text-xs mt-0.5">Thank you for supporting Noor Quran</p>
            </>
          ) : isLoading ? (
            <>
              <p className="text-white text-sm font-semibold">🤍 Support Noor Quran</p>
              <p className="text-pink-600 text-xs mt-0.5">Loading ad, please wait…</p>
            </>
          ) : (
            <>
              <p className="text-white text-sm font-semibold">🤍 Support Noor Quran</p>
              <p className="text-pink-600 text-xs mt-0.5">Watch a short ad to support us</p>
            </>
          )}
        </div>

        {/* Right badge */}
        {!isLoading && !isDone && (
          <span
            className="text-[10px] font-bold text-pink-400 px-2 py-1 rounded-full border border-pink-900/50 shrink-0"
            style={{ background: "rgba(236,72,153,0.1)" }}
          >
            FREE
          </span>
        )}
      </button>
    </>
  );
}
