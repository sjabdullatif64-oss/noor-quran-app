// Noor Quran — Android hardware back-button handling via @capacitor/app.
//
// Behaviour:
//  • On any non-root page  → navigate to parent route (Wouter location-based, not history)
//  • On root "/" first press → show "Press back again to exit" toast, start 2 s timer
//  • On root "/" second press within 2 s → exit the app
//  • Timer resets if user waits longer than 2 s before pressing again
//
// Why we ignore canGoBack:
//   In a Wouter SPA Capacitor app, the WebView's browser history always has at
//   least one entry (the initial load), so canGoBack is virtually always true.
//   Relying on it causes window.history.back() to fire even at the logical app
//   root, which skips our exit logic entirely. We use Wouter location instead.
//
// No-ops entirely in the browser (non-native build).

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { App } from "@capacitor/app";
import { isNative } from "../lib/capacitor";

// ── Lightweight DOM toast (no React state, no hooks) ──────────────────────────
function showExitToast() {
  const existing = document.getElementById("noor-exit-toast");
  if (existing) existing.remove();

  const el = document.createElement("div");
  el.id = "noor-exit-toast";
  el.textContent = "Press back again to exit Noor Quran";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");

  Object.assign(el.style, {
    position:      "fixed",
    bottom:        "96px",
    left:          "50%",
    transform:     "translateX(-50%)",
    background:    "rgba(10,31,18,0.92)",
    color:         "#86efac",
    padding:       "12px 22px",
    borderRadius:  "999px",
    fontSize:      "14px",
    fontFamily:    "system-ui, sans-serif",
    fontWeight:    "600",
    zIndex:        "99999",
    pointerEvents: "none",
    whiteSpace:    "nowrap",
    border:        "1px solid rgba(26,92,56,0.6)",
    boxShadow:     "0 4px 20px rgba(0,0,0,0.5)",
    opacity:       "0",
    transition:    "opacity 0.18s ease",
  });

  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = "1"; });

  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, 2000);
}

export function useAndroidBack() {
  const [location, setLocation] = useLocation();

  // useRef so the closure inside addListener always sees the latest values
  const locationRef      = useRef(location);
  const setLocationRef   = useRef(setLocation);
  const backPressCount   = useRef(0);
  const backTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with current values (no effect re-subscription needed)
  useEffect(() => { locationRef.current = location; }, [location]);
  useEffect(() => { setLocationRef.current = setLocation; }, [setLocation]);

  useEffect(() => {
    if (!isNative()) return;

    let listenerHandle: { remove: () => void } | null = null;
    let unmounted = false;

    // App.addListener returns Promise<PluginListenerHandle> in Capacitor v8
    App.addListener("backButton", () => {
      const loc       = locationRef.current;
      const navigate  = setLocationRef.current;
      const isRoot    = loc === "/" || loc === "";

      // ── Non-root: go up one level in our Wouter route tree ───────────────
      if (!isRoot) {
        const parts = loc.split("/").filter(Boolean);
        if (parts.length > 1) {
          navigate("/" + parts.slice(0, -1).join("/"));
        } else {
          navigate("/");
        }
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
    }).then((handle) => {
      if (unmounted) {
        handle.remove(); // cleanup already ran before the Promise resolved
      } else {
        listenerHandle = handle;
      }
    });

    return () => {
      unmounted = true;
      listenerHandle?.remove();
      if (backTimer.current) clearTimeout(backTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← intentionally empty: refs keep everything fresh without re-subscribing
}
