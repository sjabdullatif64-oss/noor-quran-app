// Noor Quran — Android hardware back-button handling.
//
// Strategy:
//  • Maintain an in-memory navigation stack.  Every Wouter location change
//    (forward navigation) is pushed onto the stack.
//  • On back press with stack depth > 1: pop current route, call Wouter
//    navigate() to the previous route.  This is reliable in Capacitor because
//    it drives routing through Wouter (not window.history.back(), which may
//    not trigger Wouter's popstate listener in the Capacitor WebView).
//  • On back press at stack depth 1 (root): double-back-to-exit with toast.
//
// Why NOT window.history.back():
//   Capacitor's WebView sometimes does not fire popstate after history.back(),
//   so Wouter never hears the navigation.  Explicit navigate() is 100% reliable.
//
// No-ops in the browser — App.addListener resolves but the event never fires.

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

  // navStack: always starts with "/" at index 0.
  // If the app opens directly on a sub-route, pre-seed "/" beneath it.
  const navStack = useRef<string[]>(
    location === "/" || location === "" ? ["/"] : ["/", location],
  );
  const locationRef    = useRef(location);
  const isBackNav      = useRef(false); // true while WE caused the navigate
  const backPressCount = useRef(0);
  const backTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Track every forward navigation ────────────────────────────────────────
  useEffect(() => {
    if (isBackNav.current) {
      // This change was triggered by our back press — don't push it again
      isBackNav.current = false;
    } else if (location !== locationRef.current) {
      navStack.current.push(location);
    }
    locationRef.current = location;
  }, [location]);

  // ── Register the Capacitor back-button listener ────────────────────────────
  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let unmounted = false;

    App.addListener("backButton", () => {
      const stack = navStack.current;

      if (stack.length > 1) {
        // Pop the current route and navigate to the previous one
        stack.pop();
        const prev = stack[stack.length - 1] ?? "/";
        isBackNav.current = true;
        navigate(prev);
        return;
      }

      // Stack depth 1 — we are at (or have returned to) root.
      // Double-back-to-exit pattern.
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
  }, [navigate]);
}
