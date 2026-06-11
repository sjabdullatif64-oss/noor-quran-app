// Noor Quran — Android hardware back-button handling.

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { App } from "@capacitor/app";
import type { BackButtonListenerEvent } from "@capacitor/app";

function showExitToast() {
  const TOAST_ID = "noor-exit-toast";
  document.getElementById(TOAST_ID)?.remove();

  const el = document.createElement("div");
  el.id = TOAST_ID;
  el.textContent = "Press back again to exit Noor Quran";

  Object.assign(el.style, {
    position: "fixed",
    bottom: "100px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(7,26,14,0.96)",
    color: "#86efac",
    padding: "13px 24px",
    borderRadius: "999px",
    fontSize: "14px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontWeight: "600",
    zIndex: "2147483647",
    pointerEvents: "none",
    whiteSpace: "nowrap",
    border: "1px solid rgba(26,92,56,0.7)",
    boxShadow: "0 6px 32px rgba(0,0,0,0.7)",
    opacity: "0",
    transition: "opacity 0.18s ease",
  });

  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
  });

  setTimeout(() => {
    el.style.opacity = "0";
    el.addEventListener("transitionend", () => el.remove(), { once: true });
  }, 2000);
}

const ROOT_ROUTES = new Set(["/", "/quran", "/prayer-times", "/more"]);

export function useAndroidBack() {
  const [location, navigate] = useLocation();
  const locationRef = useRef(location);
  const lastBackTime = useRef(0);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let unmounted = false;

    const goBack = (event?: BackButtonListenerEvent) => {
      const current = locationRef.current || "/";

      // If user is on a main bottom-tab route:
      // - If Home, double-back exits.
      // - If Quran/Prayers/More, go Home first.
      if (ROOT_ROUTES.has(current)) {
        if (current !== "/") {
          navigate("/");
          return;
        }

        const now = Date.now();
        if (now - lastBackTime.current < 2000) {
          App.exitApp().catch(() => {});
          return;
        }

        lastBackTime.current = now;
        showExitToast();
        return;
      }

      // Any sub-screen: go back in WebView history.
      // Use canGoBack from the App plugin event (authoritative Android side answer).
      // Fallback to window.history.length for safety in non-Capacitor environments.
      const canGoBack = event?.canGoBack ?? (window.history.length > 1);
      if (canGoBack) {
        window.history.back();
        // Dispatch popstate so Wouter re-evaluates location in Capacitor WebView.
        setTimeout(() => {
          window.dispatchEvent(new PopStateEvent("popstate"));
        }, 50);
      } else {
        navigate("/");
      }
    };

    App.addListener("backButton", goBack)
      .then((h) => {
        if (unmounted) h.remove();
        else handle = h;
      })
      .catch(() => {
        // Browser/no Capacitor App plugin — ignore
      });

    return () => {
      unmounted = true;
      handle?.remove();
    };
  }, [navigate]);
}