/**
 * RewardedAdButton — "Support Noor Quran" button with native AdMob Rewarded Ad.
 *
 * AdMob App ID   : ca-app-pub-5050437827917011~3831002202  (AndroidManifest.xml)
 * Banner Ad Unit : ca-app-pub-5050437827917011/8806398221
 *
 * ⚠️  ACTION REQUIRED — REWARDED UNIT ID:
 *   You currently only have ONE ad unit (the banner unit above).
 *   A Rewarded ad MUST use a unit created as type "Rewarded" in AdMob.
 *   Using a Banner unit ID for rewarded requests causes AdMob to return
 *   error code 2 (invalid request) every single time — this is why rewarded
 *   ads fail instantly.
 *
 *   HOW TO FIX:
 *   1. Go to AdMob → Apps → Noor Quran → Ad units → Add ad unit
 *   2. Choose "Rewarded" as the format
 *   3. Name it (e.g. "Noor Quran Rewarded")
 *   4. Copy the new unit ID (ca-app-pub-5050437827917011/XXXXXXXXX)
 *   5. Replace REWARDED_AD_UNIT below with it
 *   6. Rebuild the APK
 *
 *   Until you do this, the rewarded button will always show the fallback
 *   screen (which is a graceful experience, not a crash).
 *
 * Flow (native APK with a real Rewarded unit):
 *  1. User taps button → prepareRewardVideoAd() starts loading
 *  2. Ad loads (Loaded event) → showRewardVideoAd() presents full-screen ad
 *  3. User earns reward (Rewarded event) → wasRewarded = true, thank-you toast
 *  4. Ad closes (Dismissed event) → reset to idle
 *  5. Any failure → graceful fallback screen
 */

import { useState, useRef, useEffect } from "react";
import { Heart, Loader2, X } from "lucide-react";
import { isNative } from "@/lib/capacitor";
import { useToast } from "@/hooks/use-toast";
import type { PluginListenerHandle } from "@capacitor/core";

// ── Ad Unit IDs ───────────────────────────────────────────────────────────────
// ⚠️ Replace with your actual Rewarded unit ID from AdMob dashboard.
// The banner unit ID CANNOT be used here — it will always fail.
const REWARDED_AD_UNIT = "ca-app-pub-5050437827917011/REPLACE_WITH_REWARDED_UNIT_ID";

const JAZAK_TITLE     = "JazakAllah Khair 🌙";
const JAZAK_MSG       = "JazakAllah for supporting Noor Quran 🌙";
const LOAD_TIMEOUT_MS = 30_000;

function log(msg: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[AdMob Rewarded] ${msg}`, data);
  } else {
    console.log(`[AdMob Rewarded] ${msg}`);
  }
}

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
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-emerald-600 hover:text-emerald-400 transition-colors"
          style={{ background: "rgba(26,92,56,0.25)" }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, #1a5c38, transparent)" }}
        />

        <div className="px-7 pt-10 pb-8">
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

          <h2 className="text-2xl font-bold mb-1" style={{ color: "#e8f5ee", letterSpacing: "-0.02em" }}>
            MashaAllah 🤍
          </h2>

          <div className="flex items-center gap-2 justify-center my-4">
            <div className="h-px flex-1" style={{ background: "rgba(26,92,56,0.4)" }} />
            <span className="text-emerald-700 text-xs">✦</span>
            <div className="h-px flex-1" style={{ background: "rgba(26,92,56,0.4)" }} />
          </div>

          <p className="text-base font-semibold mb-1" style={{ color: "rgba(134,239,172,0.7)" }}>
            New rewards coming soon
          </p>

          <p className="text-sm leading-relaxed" style={{ color: "rgba(200,230,215,0.75)" }}>
            Thank you for supporting Noor Quran.
            <br />
            Your kindness helps this Islamic app grow for everyone.
          </p>

          <p className="mt-4 text-xs" style={{ color: "rgba(52,211,153,0.55)", fontStyle: "italic" }}>
            "And whoever does good — Allah is appreciative and Knowing." — Quran 2:158
          </p>

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

  const mountedRef  = useRef(true);
  const wasRewarded = useRef(false);
  const listeners   = useRef<PluginListenerHandle[]>([]);
  const loadTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function safeSet(s: AdState) {
    if (mountedRef.current) setAdState(s);
  }

  function showFallback(reason: string) {
    log(`showFallback — reason: ${reason}`);
    clearLoadTimer();
    cleanupListeners();
    safeSet("fallback");
  }

  async function handleSupport() {
    if (adState !== "idle") return;

    if (!isNative()) {
      toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
      safeSet("done");
      setTimeout(() => safeSet("idle"), 4000);
      return;
    }

    // Detect placeholder unit ID — show fallback immediately with clear log
    if (REWARDED_AD_UNIT.includes("REPLACE_WITH")) {
      log("⚠️  Rewarded unit ID is still the placeholder. Create a Rewarded unit in AdMob and update REWARDED_AD_UNIT.");
      showFallback("placeholder unit ID");
      return;
    }

    wasRewarded.current = false;
    safeSet("loading");
    log(`Loading rewarded ad — unit: ${REWARDED_AD_UNIT}`);

    try {
      const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob");

      // Clean up any stale listeners from a previous attempt
      cleanupListeners();

      const onLoaded = await AdMob.addListener(RewardAdPluginEvents.Loaded, async () => {
        log("Loaded ✓ — calling showRewardVideoAd()");
        clearLoadTimer();
        if (!mountedRef.current) return;
        safeSet("showing");
        try {
          await AdMob.showRewardVideoAd();
          log("showRewardVideoAd() returned");
        } catch (err) {
          log("showRewardVideoAd() threw", err);
          showFallback("showRewardVideoAd threw");
        }
      });

      const onRewarded = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward) => {
        log("Rewarded ✓", reward);
        wasRewarded.current = true;
        if (!mountedRef.current) return;
        toast({ title: JAZAK_TITLE, description: JAZAK_MSG });
        safeSet("done");
      });

      const onDismissed = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        log(`Dismissed (wasRewarded=${wasRewarded.current})`);
        if (!mountedRef.current) return;
        if (wasRewarded.current) {
          setTimeout(() => safeSet("idle"), 4000);
        } else {
          toast({ title: "JazakAllah 🌙", description: "Thanks for trying! Your support means the world." });
          safeSet("done");
          setTimeout(() => safeSet("idle"), 3000);
        }
      });

      const onFailedToShow = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err) => {
        log("FailedToShow ✗", err);
        showFallback("FailedToShow");
      });

      const onFailedToLoad = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
        log("FailedToLoad ✗", err);
        showFallback("FailedToLoad");
      });

      listeners.current = [onLoaded, onRewarded, onDismissed, onFailedToShow, onFailedToLoad];

      // 30-second safety net
      loadTimer.current = setTimeout(() => {
        if (mountedRef.current) {
          log("Load timeout after 30 s");
          showFallback("timeout");
        }
      }, LOAD_TIMEOUT_MS);

      log("Calling prepareRewardVideoAd()…");
      await AdMob.prepareRewardVideoAd({
        adId:      REWARDED_AD_UNIT,
        isTesting: false,
      });
    } catch (err) {
      log("Unexpected error", err);
      showFallback("unexpected exception");
    }
  }

  const isLoading = adState === "loading" || adState === "showing";
  const isDone    = adState === "done";

  return (
    <>
      {adState === "fallback" && <FallbackScreen onClose={() => safeSet("idle")} />}

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
