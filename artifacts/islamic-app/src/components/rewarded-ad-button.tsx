/**
 * RewardedAdButton — "Support Noor Quran" button with native AdMob Rewarded Ad.
 *
 * AdMob App ID   : ca-app-pub-5050437827917011~3831002202  (AndroidManifest.xml)
 * Rewarded Unit  : ca-app-pub-5050437827917011/8806398221
 *
 * Flow (native APK):
 *  1. User taps button → prepareRewardVideoAd() starts loading
 *  2. Ad loads successfully → showRewardVideoAd() presents the full-screen ad
 *  3. On Rewarded or Dismissed → show JazakAllah toast
 *  4. On any error / no inventory → beautiful fallback screen (never a blank or crash)
 *
 * In browser / non-Capacitor: shows the thank-you toast directly (no-op ad).
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
const REWARDED_AD_UNIT = "ca-app-pub-5050437827917011/8806398221";
const JAZAK_TITLE      = "JazakAllah Khair 🌙";
const JAZAK_MSG        = "JazakAllah for supporting Noor Quran 🌙";

// ── Types ─────────────────────────────────────────────────────────────────────
type AdState = "idle" | "loading" | "showing" | "done" | "fallback";

// ── Fallback Screen ────────────────────────────────────────────────────────────
function FallbackScreen({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in after mount
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
  const [adState, setAdState]   = useState<AdState>("idle");
  const { toast }               = useToast();
  const listeners               = useRef<PluginListenerHandle[]>([]);
  const mountedRef              = useRef(true);

  // Cleanup listeners helper
  function clearListeners() {
    listeners.current.forEach((h) => h.remove().catch(() => {}));
    listeners.current = [];
  }

  function showFallback() {
    clearListeners();
    if (mountedRef.current) setAdState("fallback");
  }

  function closeFallback() {
    if (mountedRef.current) setAdState("idle");
  }

  async function handleSupport() {
    if (adState !== "idle") return;

    // ── Browser / web fallback — show thank-you toast directly ──────────────
    if (!isNative()) {
      toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
      setAdState("done");
      setTimeout(() => { if (mountedRef.current) setAdState("idle"); }, 4000);
      return;
    }

    // ── Native APK — load and show rewarded ad ───────────────────────────────
    setAdState("loading");
    mountedRef.current = true;

    try {
      const {
        AdMob,
        RewardAdPluginEvents,
      } = await import("@capacitor-community/admob");

      // Initialize AdMob before any ad call (safe to call multiple times)
      await AdMob.initialize({}).catch(() => { /* already initialized */ });

      // Rewarded — user watched enough to earn reward
      const onRewarded = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        () => {
          if (mountedRef.current) {
            toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
            setAdState("done");
          }
        }
      );

      // Dismissed — ad closed (say thank you regardless of completion)
      const onDismissed = await AdMob.addListener(
        RewardAdPluginEvents.Dismissed,
        () => {
          clearListeners();
          if (mountedRef.current) {
            toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
            setAdState("done");
            setTimeout(() => { if (mountedRef.current) setAdState("idle"); }, 4000);
          }
        }
      );

      // Failed to show — ad loaded but couldn't display
      const onFailedToShow = await AdMob.addListener(
        RewardAdPluginEvents.FailedToShow,
        () => showFallback()
      );

      // Loaded — ready to show
      const onLoaded = await AdMob.addListener(
        RewardAdPluginEvents.Loaded,
        async () => {
          if (!mountedRef.current) return;
          setAdState("showing");
          try {
            await AdMob.showRewardVideoAd();
          } catch {
            showFallback();
          }
        }
      );

      // Failed to load — no inventory or network issue
      const onFailedToLoad = await AdMob.addListener(
        RewardAdPluginEvents.FailedToLoad,
        () => showFallback()
      );

      listeners.current = [onLoaded, onRewarded, onDismissed, onFailedToLoad, onFailedToShow];

      // Start loading the ad
      await AdMob.prepareRewardVideoAd({
        adId: REWARDED_AD_UNIT,
        isTesting: false,
      });

    } catch {
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
