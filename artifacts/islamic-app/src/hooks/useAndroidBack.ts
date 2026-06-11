import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { App } from "@capacitor/app";

function showExitToast() {
  const id = "noor-exit-toast";
  document.getElementById(id)?.remove();

  const el = document.createElement("div");
  el.id = id;
  el.textContent = "Press back again to exit";

  Object.assign(el.style, {
    position: "fixed",
    bottom: "95px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.85)",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "999px",
    fontSize: "14px",
    zIndex: "2147483647",
    pointerEvents: "none",
  });

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

const HOME_ROUTE = "/";

export function useAndroidBack() {
  const [location, navigate] = useLocation();

  const locationRef = useRef(location || HOME_ROUTE);
  const routeStackRef = useRef<string[]>([location || HOME_ROUTE]);
  const isProgrammaticBackRef = useRef(false);
  const lastBackRef = useRef(0);

  useEffect(() => {
    const nextLocation = location || HOME_ROUTE;
    const currentLocation = locationRef.current;

    if (nextLocation === currentLocation) return;

    if (isProgrammaticBackRef.current) {
      isProgrammaticBackRef.current = false;
      locationRef.current = nextLocation;
      return;
    }

    const stack = routeStackRef.current;
    const last = stack[stack.length - 1];

    if (last !== nextLocation) {
      stack.push(nextLocation);
    }

    locationRef.current = nextLocation;
  }, [location]);

  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let unmounted = false;

    App.addListener("backButton", () => {
      const current = locationRef.current || HOME_ROUTE;
      const stack = routeStackRef.current;

      if (current !== HOME_ROUTE && stack.length > 1) {
        stack.pop();

        const previous = stack[stack.length - 1] || HOME_ROUTE;
        isProgrammaticBackRef.current = true;
        locationRef.current = previous;
        navigate(previous);
        return;
      }

      if (current !== HOME_ROUTE) {
        routeStackRef.current = [HOME_ROUTE];
        isProgrammaticBackRef.current = true;
        locationRef.current = HOME_ROUTE;
        navigate(HOME_ROUTE);
        return;
      }

      const now = Date.now();

      if (now - lastBackRef.current < 2000) {
        App.exitApp().catch(() => {});
        return;
      }

      lastBackRef.current = now;
      showExitToast();
    })
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