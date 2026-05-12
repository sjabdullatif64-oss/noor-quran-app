// Noor Quran — Android hardware back-button handling.
//
// Strategy:
//  • Non-root page → window.history.back() (WebView handles it; Wouter
//    reacts to the popstate event naturally — no fragile setLocation calls)
//  • Root "/" first press  → "Press back again to exit" toast + 2 s timer
//  • Root "/" second press within 2 s → App.exitApp()
//
// Why window.history.back() instead of Wouter setLocation():
//   setLocation() pushes a new history entry; back() pops the existing one.
//   Popping is exactly what the Android back button should do.
//
// Why we ignore canGoBack from the Capacitor event:
//   In a Wouter SPA the WebView always has history entries after any navigation,
//   so canGoBack is virtually always true and cannot reliably signal "at root".
//   We use window.history.length and the Wouter location instead.
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
  const [location] = useLocation();
  const locationRef    = useRef(location);
  const backPressCount = useRef(0);
  const backTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync — the listener always reads the latest value without
  // needing to re-register every time location changes.
  useEffect(() => { locationRef.current = location; }, [location]);

  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let unmounted = false;

    App.addListener("backButton", () => {
      const loc    = locationRef.current;
      const isRoot = loc === "/" || loc === "";

      // ── Non-root: let the WebView pop its own history ─────────────────────
      // Wouter automatically reacts to the resulting popstate event.
      if (!isRoot) {
        window.history.back();
        return;
      }

      // ── Root: double-back-to-exit ─────────────────────────────────────────
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
  }, []); // intentionally empty — locationRef keeps everything fresh
}
