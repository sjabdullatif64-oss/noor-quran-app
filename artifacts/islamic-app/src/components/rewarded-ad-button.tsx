/**
 * RewardedAdButton — "Support Noor Quran" button with native AdMob Rewarded Ad.
 *
 * AdMob App ID   : ca-app-pub-5050437827917011~3831002202  (AndroidManifest.xml)
 * Rewarded Unit  : ca-app-pub-5050437827917011/8806398221
 *
 * Flow (native APK):
 *  1. User taps button → prepareRewardVideoAd() starts loading
 *  2. Ad loads → showRewardVideoAd() presents the full-screen ad
 *  3. On Rewarded or Dismissed → show JazakAllah toast
 *  4. On any error → graceful fallback toast, no crash
 *
 * In browser / non-Capacitor: shows the thank-you message directly (no-op ad).
 *
 * Google Play policy compliance:
 *  - Fully voluntary — user must tap to start
 *  - Never gate core functionality behind watching an ad
 *  - Label clearly states what happens ("Watch a short ad to support us")
 */

import { useState, useRef } from "react";
import { Heart, Loader2 } from "lucide-react";
import { isNative } from "@/lib/capacitor";
import { useToast } from "@/hooks/use-toast";
import type { PluginListenerHandle } from "@capacitor/core";

// ── Constants ─────────────────────────────────────────────────────────────────
const REWARDED_AD_UNIT = "ca-app-pub-5050437827917011/8806398221";
const JAZAK_TITLE      = "JazakAllah Khair 🌙";
const JAZAK_MSG        = "JazakAllah for supporting Noor Quran 🌙";

// ── Types ─────────────────────────────────────────────────────────────────────
type AdState = "idle" | "loading" | "showing" | "done";

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

  async function handleSupport() {
    if (adState !== "idle") return;

    // ── Browser / web fallback — show thank-you directly ──────────────────────
    if (!isNative()) {
      toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
      setAdState("done");
      setTimeout(() => setAdState("idle"), 4000);
      return;
    }

    // ── Native APK — load and show rewarded ad ────────────────────────────────
    setAdState("loading");
    mountedRef.current = true;

    try {
      const {
        AdMob,
        RewardAdPluginEvents,
      } = await import("@capacitor-community/admob");

      // Subscribe to rewarded ad events
      const onRewarded = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        () => {
          // User watched enough to earn reward — show thanks
          if (mountedRef.current) {
            toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
            setAdState("done");
          }
        }
      );

      const onDismissed = await AdMob.addListener(
        RewardAdPluginEvents.Dismissed,
        () => {
          // Ad closed (may or may not have fully watched — still say thank you)
          clearListeners();
          if (mountedRef.current) {
            toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
            setAdState("done");
          }
          setTimeout(() => {
            if (mountedRef.current) setAdState("idle");
          }, 4000);
        }
      );

      const onFailedToShow = await AdMob.addListener(
        RewardAdPluginEvents.FailedToShow,
        () => {
          clearListeners();
          if (mountedRef.current) {
            toast({
              title: "Ad unavailable",
              description: "No ad available right now. Please try again later.",
            });
            setAdState("idle");
          }
        }
      );

      const onLoaded = await AdMob.addListener(
        RewardAdPluginEvents.Loaded,
        async () => {
          if (!mountedRef.current) return;
          setAdState("showing");
          try {
            await AdMob.showRewardVideoAd();
          } catch {
            clearListeners();
            if (mountedRef.current) {
              toast({
                title: "Ad unavailable",
                description: "Couldn't show the ad. Please try again later.",
              });
              setAdState("idle");
            }
          }
        }
      );

      const onFailedToLoad = await AdMob.addListener(
        RewardAdPluginEvents.FailedToLoad,
        (err) => {
          clearListeners();
          console.warn("[AdMob] Rewarded ad failed to load:", err);
          if (mountedRef.current) {
            toast({
              title: "Ad unavailable",
              description: "No ad available right now. JazakAllah for your support 🌙",
            });
            setAdState("idle");
          }
        }
      );

      listeners.current = [onLoaded, onRewarded, onDismissed, onFailedToLoad, onFailedToShow];

      // Start loading the ad
      await AdMob.prepareRewardVideoAd({
        adId: REWARDED_AD_UNIT,
        isTesting: false,
      });

    } catch (err) {
      clearListeners();
      console.warn("[AdMob] Rewarded ad error:", err);
      if (mountedRef.current) {
        toast({
          title: "Ad unavailable",
          description: "Couldn't load the ad right now. Try again later.",
        });
        setAdState("idle");
      }
    }
  }

  const isLoading = adState === "loading" || adState === "showing";
  const isDone    = adState === "done";

  return (
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
  );
}
