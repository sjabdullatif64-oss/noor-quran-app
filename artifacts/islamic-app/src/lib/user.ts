import { Capacitor } from "@capacitor/core";
import { noorApi, type NoorUser } from "./noor-api";

const DEVICE_ID_KEY  = "noor-device-id";
const PENDING_REF_KEY = "noor-pending-ref";

function generateDeviceId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── Referral code helpers ─────────────────────────────────────────────────────

/** Strict UUID-v4 format check: 8-4-4-4-12 lowercase hex groups. */
function isValidRef(ref: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(ref);
}

/**
 * Capture ?ref= from the web URL immediately when this module first loads.
 * Runs synchronously before any SPA navigation can replace the query string.
 * No-ops on Android (window.location.search is empty in Capacitor WebView).
 */
(function captureWebRef() {
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && isValidRef(ref)) {
      localStorage.setItem(PENDING_REF_KEY, ref);
    }
  } catch {
    // not in a browser context
  }
})();

/**
 * Save a referral code from an external source (e.g. Android deep-link URL).
 * Called by native-init when the app opens via an App Link.
 */
export function saveReferralCode(ref: string): void {
  if (isValidRef(ref)) {
    try { localStorage.setItem(PENDING_REF_KEY, ref); } catch {}
  }
}

function getPendingRef(): string | undefined {
  try {
    const ref = localStorage.getItem(PENDING_REF_KEY);
    if (ref && isValidRef(ref)) return ref;
  } catch {}
  return undefined;
}

/**
 * On Android, call Capacitor's getLaunchUrl() to extract ?ref= from the
 * deep-link URL that started the app. Must be awaited before registration.
 */
async function captureNativeLaunchRef(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { getAppPlugin } = await import("./capacitor");
    const app = getAppPlugin();
    if (!app) return;
    const launch = await app.getLaunchUrl();
    if (launch?.url) {
      const ref = new URL(launch.url).searchParams.get("ref");
      if (ref && isValidRef(ref)) {
        try { localStorage.setItem(PENDING_REF_KEY, ref); } catch {}
      }
    }
  } catch {
    // ignore — optional native check
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

let _registrationPromise: Promise<NoorUser | null> | null = null;

export async function ensureRegistered(): Promise<NoorUser | null> {
  if (_registrationPromise) return _registrationPromise;

  _registrationPromise = (async () => {
    // On Android, check the Capacitor launch URL for a ?ref= before reading
    // the pending ref — window.location.search is empty in the native WebView.
    await captureNativeLaunchRef();

    const deviceId    = getDeviceId();
    const referredById = getPendingRef();
    try {
      const { user } = await noorApi.register(deviceId, referredById);
      // Clear the pending ref after the registration call succeeds.
      // New user with ref: ref was applied. Existing user: ref cannot be applied retroactively.
      try { localStorage.removeItem(PENDING_REF_KEY); } catch {}
      return user;
    } catch (err) {
      console.warn("[Noor] User registration failed:", err);
      // Reset the singleton so the next call can retry.
      // The pending ref stays in localStorage for the next attempt.
      _registrationPromise = null;
      return null;
    }
  })();

  return _registrationPromise;
}

export async function reportAyahComplete(
  surahNumber: number,
  ayahNumber: number,
): Promise<void> {
  const deviceId = getDeviceId();
  try {
    await noorApi.ayahReward(deviceId, surahNumber, ayahNumber);
  } catch {
    // Silent — rewards are optional
  }
}
