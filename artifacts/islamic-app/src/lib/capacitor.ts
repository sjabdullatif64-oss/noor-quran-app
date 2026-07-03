// Noor Quran — Capacitor native bridge
// All native API calls are gated behind isNative() so the web build is unaffected.

import { isCapacitorApp } from "./notifications";

// Static imports — avoids the async dynamic-import gap that breaks Android's
// user-gesture context requirement for share sheets and external browsers.
// Capacitor plugins are safe to import in all environments; they no-op outside native.
import { Share } from "@capacitor/share";
import { Browser } from "@capacitor/browser";

export { isCapacitorApp as isNative };

// ── Type-safe Capacitor plugin access ────────────────────────────────────────

type CapWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    Plugins?: Record<string, unknown>;
  };
};

function getPlugin<T>(name: string): T | null {
  const cap = (window as CapWindow).Capacitor;
  const plugin = cap?.Plugins?.[name];
  return plugin ? (plugin as T) : null;
}

// ── App plugin — back-button handling ────────────────────────────────────────

interface AppPlugin {
  addListener(
    event: "backButton",
    handler: (data: { canGoBack: boolean }) => void
  ): { remove: () => void };
  addListener(
    event: "appUrlOpen",
    handler: (data: { url: string }) => void
  ): { remove: () => void };
  exitApp(): Promise<void>;
  getInfo(): Promise<{ name: string; id: string; build: string; version: string }>;
  getLaunchUrl(): Promise<{ url: string } | null>;
}

export function getAppPlugin(): AppPlugin | null {
  return getPlugin<AppPlugin>("App");
}

// ── Status Bar ────────────────────────────────────────────────────────────────

interface StatusBarPlugin {
  setStyle(opts: { style: "Dark" | "Light" | "Default" }): Promise<void>;
  setBackgroundColor(opts: { color: string }): Promise<void>;
  setOverlaysWebView(opts: { overlay: boolean }): Promise<void>;
  hide(): Promise<void>;
  show(): Promise<void>;
}

export async function setupStatusBar(): Promise<void> {
  if (!isCapacitorApp()) return;
  const sb = getPlugin<StatusBarPlugin>("StatusBar");
  if (!sb) return;
  try {
    await sb.setStyle({ style: "Dark" });
    await sb.setBackgroundColor({ color: "#071a0e" });
    await sb.setOverlaysWebView({ overlay: false });
  } catch {
    // ignore — some devices throw if the bar is already configured
  }
}

// ── Splash Screen ─────────────────────────────────────────────────────────────

interface SplashPlugin {
  hide(opts?: { fadeOutDuration?: number }): Promise<void>;
  show(opts?: { fadeInDuration?: number }): Promise<void>;
}

export async function hideSplash(): Promise<void> {
  if (!isCapacitorApp()) return;
  const sp = getPlugin<SplashPlugin>("SplashScreen");
  if (!sp) return;
  try {
    await sp.hide({ fadeOutDuration: 400 });
  } catch { /* ignore */ }
}

// ── Local Notifications ────────────────────────────────────────────────────────

export interface LocalNotif {
  id: number;
  title: string;
  body: string;
  schedule?: { at?: Date; every?: "day" | "week"; allowWhileIdle?: boolean };
  channelId?: string;
  iconColor?: string;
  smallIcon?: string;
  sound?: string;
}

interface LocalNotifPlugin {
  requestPermissions(): Promise<{ display: "granted" | "denied" | "prompt" }>;
  checkPermissions(): Promise<{ display: "granted" | "denied" | "prompt" }>;
  schedule(opts: { notifications: LocalNotif[] }): Promise<{ notifications: Array<{ id: number }> }>;
  cancel(opts: { notifications: Array<{ id: number }> }): Promise<void>;
  getPending(): Promise<{ notifications: LocalNotif[] }>;
  createChannel(channel: {
    id: string;
    name: string;
    description?: string;
    importance?: number;
    sound?: string;
    vibration?: boolean;
    lights?: boolean;
    lightColor?: string;
  }): Promise<void>;
}

export function getNotifPlugin(): LocalNotifPlugin | null {
  return getPlugin<LocalNotifPlugin>("LocalNotifications");
}

/** Create the Noor Quran notification channel (Android 8+). */
export async function createNotifChannel(): Promise<void> {
  const p = getNotifPlugin();
  if (!p) return;
  try {
    await p.createChannel({
      id: "noor-islamic",
      name: "Islamic Reminders",
      description: "Prayer times, Quran ayah, and dhikr reminders",
      importance: 4,
      vibration: true,
      lights: true,
      lightColor: "#1a5c38",
      // No `sound` field: "default" is not a valid Android sound resource name.
      // Android will use the device's default notification sound automatically.
    });
  } catch { /* ignore */ }
}

// ── Filesystem — save downloads to device storage ─────────────────────────────

interface FSPlugin {
  writeFile(opts: {
    path: string;
    data: string;
    directory: string;
    recursive?: boolean;
    encoding?: string;
  }): Promise<{ uri: string }>;
  readFile(opts: { path: string; directory: string; encoding?: string }): Promise<{ data: string }>;
  deleteFile(opts: { path: string; directory: string }): Promise<void>;
  mkdir(opts: { path: string; directory: string; recursive?: boolean }): Promise<void>;
  stat(opts: { path: string; directory: string }): Promise<{ type: string; size: number }>;
}

const DATA_DIR = "DATA";

export async function saveFileToDevice(
  filename: string,
  base64Data: string
): Promise<string | null> {
  const fs = getPlugin<FSPlugin>("Filesystem");
  if (!fs) return null;
  try {
    await fs.mkdir({ path: "NoorQuran/audio", directory: DATA_DIR, recursive: true });
    const result = await fs.writeFile({
      path: `NoorQuran/audio/${filename}`,
      data: base64Data,
      directory: DATA_DIR,
      recursive: true,
    });
    return result.uri;
  } catch {
    return null;
  }
}

export async function readFileFromDevice(filename: string): Promise<string | null> {
  const fs = getPlugin<FSPlugin>("Filesystem");
  if (!fs) return null;
  try {
    const result = await fs.readFile({
      path: `NoorQuran/audio/${filename}`,
      directory: DATA_DIR,
    });
    return result.data;
  } catch {
    return null;
  }
}

// ── Haptics ────────────────────────────────────────────────────────────────────

interface HapticsPlugin {
  impact(opts?: { style?: "Heavy" | "Medium" | "Light" }): Promise<void>;
  notification(opts?: { type?: "Success" | "Warning" | "Error" }): Promise<void>;
  vibrate(opts?: { duration?: number }): Promise<void>;
}

export async function hapticTap(): Promise<void> {
  if (!isCapacitorApp()) return;
  const h = getPlugin<HapticsPlugin>("Haptics");
  if (!h) return;
  try { await h.impact({ style: "Light" }); } catch { /* ignore */ }
}

export async function hapticSuccess(): Promise<void> {
  if (!isCapacitorApp()) return;
  const h = getPlugin<HapticsPlugin>("Haptics");
  if (!h) return;
  try { await h.notification({ type: "Success" }); } catch { /* ignore */ }
}

// ── Share ──────────────────────────────────────────────────────────────────────
//
// Why not navigator.share?
// navigator.share() in a Capacitor WebView blocks the JS thread while the
// native share sheet is open.  On some Android OEMs this freezes the UI for
// the entire duration of the share sheet (can be several seconds).
//
// @capacitor/share uses Capacitor's proper async IPC bridge: the JS thread
// is NOT blocked, the share sheet opens immediately, and the Promise resolves
// only after the user closes the sheet (or cancels).
//
// Strategy:
//   1. Native Android → Capacitor Share plugin (non-blocking, instant sheet)
//   2. Web / fallback → navigator.share if available (non-blocking on desktop)
//
// IMPORTANT: Share must NEVER silently fall back to copying to the clipboard.
// Copy is a separate, explicit user action (a dedicated Copy button). If the
// share sheet genuinely cannot be opened, callers show an error toast instead
// — see the `ShareResult` union below.

interface SharePlugin {
  share(opts: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }): Promise<{ activityType?: string }>;
}

export interface ShareOptions {
  title:       string;
  text:        string;
  url?:        string;
  dialogTitle?: string;
}

/**
 * - "shared"    → the native share sheet opened and the user completed a share.
 * - "cancelled" → the user opened the share sheet and dismissed it — this is
 *                 not an error and callers should stay silent (no toast, no copy).
 * - "failed"    → the share sheet could not be opened at all (no Capacitor
 *                 bridge, no Web Share API support, or a genuine plugin error).
 *                 Callers should show an error toast — never copy to clipboard.
 */
export type ShareResult = "shared" | "cancelled" | "failed";

function isCancelError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? "").toLowerCase();
  return msg.includes("cancel") || msg.includes("abort") || msg.includes("dismiss");
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  const msg = (e as { message?: string })?.message;
  return typeof msg === "string" && msg ? msg : String(e);
}

// Last real error from a failed nativeShare() call — for diagnostic toasts only.
// Never used to decide behavior; nativeShare() itself never reads this.
let lastShareError: string | null = null;

/** Returns the underlying error from the most recent failed nativeShare() call, if any. */
export function getLastShareError(): string | null {
  return lastShareError;
}

/**
 * Opens the native share sheet without blocking the UI thread.
 * Never throws — all errors are swallowed and reported via the return value.
 * Never copies to the clipboard — that is exclusively a Copy-button action.
 */
export async function nativeShare(opts: ShareOptions): Promise<ShareResult> {
  lastShareError = null;

  // 1. Always try @capacitor/share first — it opens the native Android share
  //    sheet without blocking the JS thread.
  //
  //    The isCapacitorApp() guard is intentionally REMOVED here because:
  //    • On some Capacitor builds the Capacitor bridge initialises slightly
  //      after the first user interaction, causing isCapacitorApp() to return
  //      false even when running inside the native APK.
  //    • The Share plugin is statically imported and will throw a predictable
  //      "not implemented" error on plain web — we catch that below.
  try {
    await Share.share({
      title:       opts.title,
      text:        opts.text,
      url:         opts.url,
      dialogTitle: opts.dialogTitle ?? opts.title,
    });
    return "shared";
  } catch (e) {
    if (isCancelError(e)) return "cancelled";
    // Plugin not available (web) or unexpected error — fall through to navigator.share
    lastShareError = errorMessage(e);
  }

  // 2. Web Share API (desktop Chrome, Safari, some Android browsers)
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      lastShareError = null;
      return "shared";
    } catch (e) {
      if (isCancelError(e)) return "cancelled";
      lastShareError = errorMessage(e);
      return "failed";
    }
  }

  if (!lastShareError) lastShareError = "No share target available on this device.";
  return "failed";
}

// ── External URL opener ────────────────────────────────────────────────────────
//
// window.open(_blank) in Capacitor WebView does NOT open external URLs in
// the system browser — it either does nothing or opens a new WebView.
// @capacitor/browser Browser.open() hands off to Chrome Custom Tabs on Android,
// giving users the expected in-app-browser experience.
//
// Special schemes (mailto:, market://, tel:) are always passed to window.open
// so the OS can route them to the correct app (Mail, Play Store, Phone).

export async function openUrl(url: string): Promise<void> {
  // OS-handled schemes: bypass Browser plugin and let system route the intent
  if (
    url.startsWith("mailto:") ||
    url.startsWith("market://") ||
    url.startsWith("tel:")
  ) {
    window.open(url);
    return;
  }

  if (isCapacitorApp()) {
    try {
      // Static Browser import — no async gap so Chrome Custom Tabs open reliably
      await Browser.open({ url });
      return;
    } catch {
      // Plugin unavailable — fall through to web fallback
    }
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

// ── Clipboard ──────────────────────────────────────────────────────────────────
//
// navigator.clipboard works inside the Capacitor Android WebView because the
// app runs under the secure "https://localhost" scheme. We keep a legacy
// execCommand("copy") fallback for older WebViews / non-secure contexts.

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ── Network ────────────────────────────────────────────────────────────────────

interface NetworkPlugin {
  getStatus(): Promise<{ connected: boolean; connectionType: string }>;
  addListener(event: "networkStatusChange", handler: (status: { connected: boolean }) => void): { remove: () => void };
}

export async function isConnected(): Promise<boolean> {
  if (!isCapacitorApp()) return navigator.onLine;
  const net = getPlugin<NetworkPlugin>("Network");
  if (!net) return navigator.onLine;
  try {
    const status = await net.getStatus();
    return status.connected;
  } catch {
    return navigator.onLine;
  }
}
