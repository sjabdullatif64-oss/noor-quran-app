// Noor Quran — Android hardware back-button handling via Capacitor App plugin
// Registers a back-button listener only when running inside the native APK.
// On the root route ("/") it asks the user before exiting; elsewhere it navigates back.

import { useEffect } from "react";
import { useLocation } from "wouter";
import { getAppPlugin, isNative } from "../lib/capacitor";

export function useAndroidBack() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isNative()) return;

    const app = getAppPlugin();
    if (!app) return;

    const listener = app.addListener("backButton", ({ canGoBack }) => {
      // If the browser history can go back, use that first
      if (canGoBack) {
        window.history.back();
        return;
      }

      // On root or when history is exhausted, confirm exit
      if (location === "/" || location === "") {
        // Show a simple native-feeling exit confirmation
        const exitConfirmed = window.confirm("Exit Noor Quran?");
        if (exitConfirmed) {
          app.exitApp().catch(() => {
            // Fallback: can't programmatically exit on some Android versions
          });
        }
      } else {
        // Navigate up one level
        const parts = location.split("/").filter(Boolean);
        if (parts.length > 1) {
          setLocation("/" + parts.slice(0, -1).join("/"));
        } else {
          setLocation("/");
        }
      }
    });

    return () => {
      listener.remove();
    };
  }, [location, setLocation]);
}
