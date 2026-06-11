// Noor Quran — Android hardware back-button handling.
//
// Strategy:
//  • Track forward navigation in a custom stack (navStack ref).
//  • Back press with history: pop stack, navigate to previous with Wouter.
//  • Back press at root (stack exhausted): "Press back again to exit" toast + 2 s timer.
//  • Second back press within 2 s at root: App.exitApp().
//
// Why NOT window.history.back():
//   In Capacitor WebView, window.history.back() is unreliable — it may not
//   fire a popstate event on all Android versions/OEMs, so Wouter never updates
//   and the screen appears frozen.  Using Wouter's own navigate() is guaranteed
//   to update the router state and re-render the correct screen.
//
// Why a custom stack instead of window.history.length:
//   Capacitor WebView's history.length counts the native WebView entries, which
//   can include non-Wouter states.  Our own stack only contains real in-app
//   navigations so back behaviour is always predictable.
//
// No-ops in the browser — App.addListener resolves but the event never fires
// because there is no hardware back button.

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { App } from "@capacitor/app";

// ── DOM toast — no React state, no hooks ─────────────────────────────────────
function showExitToast() {
  const TOAST_ID = "noor-exit-toast";
  const existing = document.getElementById(TOAST_ID);
  if (existing) { existing.remove(); }

  const el = document.createElement("div");
  el.id = TOAST_ID;
  el.textContent = "Press back again to exit Noor Quran";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");

  Object.assign(el.style, {
    position:        "fixed",
    bottom:          "100px",
    left:            "50%",
    transform:       "translateX(-50%)",
    background:      "rgba(7,26,14,0.96)",
    color:           "#86efac",
    padding:         "13px 24px",
    borderRadius:    "999px",
    fontSize:        "14px",
    fontFamily:      "system-ui, -apple-system, sans-serif",
    fontWeight:      "600",
    zIndex:          "2147483647",
    pointerEvents:   "none",
    whiteSpace:      "nowrap",
    border:          "1px solid rgba(26,92,56,0.7)",
    boxShadow:       "0 6px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(52,211,153,0.12)",
    opacity:         "0",
    transition:      "opacity 0.18s ease",
    letterSpacing:   "0.01em",
  });

  document.body.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { el.style.opacity = "1"; });
  });

  setTimeout(() => {
    el.style.opacity = "0";
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  }, 2200);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAndroidBack() {
  const [location, navigate] = useLocation();

  // Always-current refs so the listener (registered once) reads latest values.
  const locationRef    = useRef(location);
  const navigateRef    = useRef(navigate);
  const navStack       = useRef<string[]>([]);   // our forward-navigation history
  const isGoingBack    = useRef(false);           // prevents back-navigations being re-pushed
  const backPressCount = useRef(0);
  const backTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { locationRef.current = location; }, [location]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // Track forward navigations in our own stack.
  // isGoingBack prevents the navigate() we fire from being counted as a new forward step.
  useEffect(() => {
    if (isGoingBack.current) {
      isGoingBack.current = false;
      return;
    }
    const last = navStack.current[navStack.current.length - 1];
    if (location !== last) {
      navStack.current.push(location);
    }
  }, [location]);

  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let unmounted = false;

    App.addListener("backButton", () => {
      const stack = navStack.current;

      // ── Has previous screen: navigate back ───────────────────────────────
      if (stack.length > 1) {
        stack.pop();                               // discard current location
        const prev = stack[stack.length - 1] ?? "/";
        isGoingBack.current = true;
        navigateRef.current(prev);                // Wouter navigate — reliable in WebView
        return;
      }

      // ── At root (no history): double-back-to-exit ────────────────────────
      backPressCount.current += 1;

      if (backPressCount.current === 1) {
        showExitToast();
        if (backTimer.current) clearTimeout(backTimer.current);
        backTimer.current = setTimeout(() => {
          backPressCount.current = 0;
        }, 2000);
      } else {
        if (backTimer.current) clearTimeout(backTimer.current);
        backPressCount.current = 0;
        App.exitApp().catch(() => {});
      }
    })
      .then((h) => {
        if (unmounted) h.remove();
        else           handle = h;
      })
      .catch(() => {
        // App plugin unavailable (browser) — no-op
      });

    return () => {
      unmounted = true;
      handle?.remove();
      if (backTimer.current) clearTimeout(backTimer.current);
    };
  }, []); // intentionally empty — all mutable values go through refs
}
