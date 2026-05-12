// Noor Quran — Android hardware back-button handling via Capacitor App plugin.
//
// Behaviour:
//  • On any non-root page  → navigate back normally (history.back or up one level)
//  • On root "/" first press → show "Press back again to exit" toast, start 2 s timer
//  • On root "/" second press within 2 s → exit the app
//  • Timer resets if user waits longer than 2 s before pressing again
//
// No-ops entirely in the browser (non-native build).

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getAppPlugin, isNative } from "../lib/capacitor";

// ── Lightweight DOM toast (no React state, no hooks) ──────────────────────────
function showExitToast() {
  // Remove any existing toast
  const existing = document.getElementById("noor-exit-toast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.id = "noor-exit-toast";
  el.textContent = "Press back again to exit Noor Quran";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");

  Object.assign(el.style, {
    position:     "fixed",
    bottom:       "96px",       // above bottom nav
    left:         "50%",
    transform:    "translateX(-50%)",
    background:   "rgba(10,31,18,0.92)",
    color:        "#86efac",    // emerald-300
    padding:      "12px 22px",
    borderRadius: "999px",
    fontSize:     "14px",
    fontFamily:   "system-ui, sans-serif",
    fontWeight:   "600",
    zIndex:       "99999",
    pointerEvents:"none",
    whiteSpace:   "nowrap",
    border:       "1px solid rgba(26,92,56,0.6)",
    boxShadow:    "0 4px 20px rgba(0,0,0,0.5)",
    opacity:      "0",
    transition:   "opacity 0.18s ease",
  });

  document.body.appendChild(el);

  // Fade in
  requestAnimationFrame(() => { el.style.opacity = "1"; });

  // Fade out and remove after 2 s
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, 2000);
}

export function useAndroidBack() {
  const [location, setLocation] = useLocation();
  const backPressCount = useRef(0);
  const backTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isNative()) return;

    const app = getAppPlugin();
    if (!app) return;

    const listenerHandle = app.addListener("backButton", ({ canGoBack }) => {
      // ── Non-root: use browser history or go up one level ─────────────────
      if (canGoBack) {
        window.history.back();
        return;
      }

      const isRoot = location === "/" || location === "";

      if (!isRoot) {
        // Navigate one level up (e.g., /quran/5 → /quran → /)
        const parts = location.split("/").filter(Boolean);
        if (parts.length > 1) {
          setLocation("/" + parts.slice(0, -1).join("/"));
        } else {
          setLocation("/");
        }
        return;
      }

      // ── Root: double-back-to-exit ─────────────────────────────────────────
      backPressCount.current += 1;

      if (backPressCount.current === 1) {
        showExitToast();
        // Reset counter after 2 s
        if (backTimer.current) clearTimeout(backTimer.current);
        backTimer.current = setTimeout(() => {
          backPressCount.current = 0;
        }, 2000);
      } else {
        // Second press — exit
        if (backTimer.current) clearTimeout(backTimer.current);
        backPressCount.current = 0;
        app.exitApp().catch(() => {
          // exitApp() may not work on all Android builds — silently ignore
        });
      }
    });

    return () => {
      listenerHandle.remove();
      if (backTimer.current) clearTimeout(backTimer.current);
    };
  }, [location, setLocation]);
}
