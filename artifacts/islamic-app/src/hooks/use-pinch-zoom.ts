import { useEffect, useRef, useState } from "react";

// ── Tunable bounds for two-finger pinch zoom ───────────────────────────────────
const MIN_SCALE = 0.75;
const MAX_SCALE = 2.2;
export const PINCH_DEFAULT_SCALE = 1;

function touchDistance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

/**
 * Two-finger pinch-to-zoom scoped to a single content container (returned as
 * `containerRef` — attach it to the element that wraps the reading content
 * only, never a page-level/app-level wrapper, so zoom never touches the rest
 * of the UI).
 *
 * - Only listens for touches while `enabled` is true.
 * - `scale` lives in React state only (never localStorage/any persistence),
 *   so it naturally resets to the default the moment the component
 *   unmounts (closing the reader) or the app restarts (closing the app).
 * - Also resets to default immediately whenever `enabled` flips to false,
 *   so turning the toggle off snaps text back to normal size.
 * - Uses non-passive `touchmove` so we can call preventDefault() during an
 *   active two-finger gesture (stops the page from scrolling mid-pinch)
 *   without affecting normal one-finger scrolling.
 */
export function usePinchZoom<T extends HTMLElement>(enabled: boolean) {
  const [scale, setScale] = useState(PINCH_DEFAULT_SCALE);
  const containerRef = useRef<T | null>(null);
  const scaleRef = useRef(scale);
  const gestureRef = useRef<{ startDistance: number; startScale: number } | null>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    if (!enabled) {
      gestureRef.current = null;
      setScale(PINCH_DEFAULT_SCALE);
    }
  }, [enabled]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        gestureRef.current = {
          startDistance: touchDistance(e.touches[0], e.touches[1]),
          startScale: scaleRef.current,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && gestureRef.current) {
        e.preventDefault();
        const current = touchDistance(e.touches[0], e.touches[1]);
        if (gestureRef.current.startDistance > 0) {
          const ratio = current / gestureRef.current.startDistance;
          const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, gestureRef.current.startScale * ratio));
          setScale(next);
        }
      }
    };

    const endGesture = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        gestureRef.current = null;
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", endGesture, { passive: true });
    el.addEventListener("touchcancel", endGesture, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", endGesture);
      el.removeEventListener("touchcancel", endGesture);
    };
  }, [enabled]);

  return { containerRef, scale };
}
