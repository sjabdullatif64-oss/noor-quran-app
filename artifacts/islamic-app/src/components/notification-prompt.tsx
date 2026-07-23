/**
 * NotificationPrompt — First-open notification permission modal.
 *
 * Shows once when the app is opened for the first time and the permission
 * state is "default" (not yet asked). The "Enable" button calls
 * Notification.requestPermission() directly from its onClick so it counts
 * as a user gesture — required by Android Chrome.
 *
 * Stored under: "noor-notif-prompted-v1" in localStorage.
 */

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import {
  isSupported,
  getPermissionState,
  requestPermission,
} from "@/lib/notifications";

const PROMPT_KEY = "noor-notif-prompted-v1";

function hasBeenPrompted(): boolean {
  return !!localStorage.getItem(PROMPT_KEY);
}

function markPrompted(): void {
  localStorage.setItem(PROMPT_KEY, "1");
}

export function NotificationPrompt() {
  const [show, setShow]       = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only show if: supported + not previously prompted + permission is default
    if (!isSupported())         return;
    if (hasBeenPrompted())      return;
    if (getPermissionState() !== "default") { markPrompted(); return; }

    // Delay slightly so the app renders first — feels less jarring
    const t = setTimeout(() => {
      setShow(true);
      requestAnimationFrame(() => setVisible(true));
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    markPrompted();
    setTimeout(() => setShow(false), 300);
  }

  async function handleEnable() {
    // requestPermission() MUST be called directly from a user onClick — do NOT await it first
    markPrompted();
    setLoading(true);
    try {
      await requestPermission();
    } catch {
      // silently ignore — permission flow handled natively
    } finally {
      setLoading(false);
      dismiss();
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center p-4 sm:items-center"
      style={{
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.28s ease",
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden bg-card border border-border"
        style={{
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.95)",
          transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Top glow bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-primary" />

        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary transition-colors bg-primary/20"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 pt-8 pb-7 space-y-5 text-center">
          {/* Icon */}
          <div className="relative mx-auto w-fit">
            <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "rgba(52,211,153,0.12)", boxShadow: "0 0 32px rgba(52,211,153,0.18)" }}>
              <Bell className="w-9 h-9 text-primary" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary animate-ping opacity-70" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Stay Connected with Allah 🌙</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Receive daily Quran verses, prayer reminders, Islamic wisdom, and morning/evening azkar — all designed to strengthen your deen.
            </p>
          </div>

          {/* Ayah */}
          <div className="rounded-2xl px-4 py-3 border border-border bg-primary/10">
            <p className="text-primary text-sm font-arabic" style={{ fontFamily: "'Amiri', serif" }}>
              وَاذْكُرُوا اللَّهَ كَثِيرًا
            </p>
            <p className="text-muted-foreground text-xs mt-1.5">"Remember Allah abundantly." — Quran 8:45</p>
          </div>

          {/* Bullets */}
          <div className="text-left space-y-2">
            {["Daily Quran Ayah at 8:00 AM", "Prayer time reminders", "Morning & evening Azkar", "Jumu'ah Mubarak every Friday"].map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <span className="w-4 h-4 rounded-full bg-primary/50 text-primary text-xs flex items-center justify-center shrink-0">✓</span>
                <span className="text-primary text-sm">{item}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-1">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-primary-foreground text-base transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2 bg-primary"
              style={{ boxShadow: "0 4px 20px rgba(52,211,153,0.22)" }}
            >
              <Bell className="w-5 h-5" />
              {loading ? "Enabling…" : "Enable Notifications"}
            </button>
            <button
              onClick={dismiss}
              className="w-full py-3 rounded-2xl text-sm font-medium text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
