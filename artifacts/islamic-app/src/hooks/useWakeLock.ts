// Noor Quran — Screen Wake Lock
// Prevents the screen from dimming/sleeping during Quran reading and audio playback.
// Uses the Screen Wake Lock API (supported on Chrome Android 84+, Edge, Safari 16.4+).
// Silently no-ops when the API is not available (older devices, Firefox).

import { useEffect, useRef } from "react";

type WakeLockSentinel = { release: () => Promise<void>; released: boolean };

/**
 * Acquires a screen wake lock for as long as the component using this hook is mounted.
 * Automatically re-acquires if the page becomes visible again (e.g., after tabbing back).
 *
 * @param active - Set to false to skip acquisition (e.g., when audio is paused).
 *                 Defaults to true (always keep awake while mounted).
 */
export function useWakeLock(active = true) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  async function acquire() {
    if (!active) return;
    if (lockRef.current && !lockRef.current.released) return; // already held
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    try {
      lockRef.current = await (navigator as Navigator & {
        wakeLock: { request: (type: "screen") => Promise<WakeLockSentinel> };
      }).wakeLock.request("screen");
    } catch {
      // Permission denied or API unavailable — silently ignore
    }
  }

  async function release() {
    if (lockRef.current && !lockRef.current.released) {
      try { await lockRef.current.release(); } catch { /* ignore */ }
      lockRef.current = null;
    }
  }

  // Re-acquire when the page becomes visible again (Android home→back scenario)
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible" && active) {
        acquire();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active]);

  useEffect(() => {
    if (active) {
      acquire();
    } else {
      release();
    }
    return () => {
      release();
    };
  }, [active]);
}
