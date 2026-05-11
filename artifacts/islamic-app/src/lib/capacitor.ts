// Noor Quran — Capacitor native bridge
// All native API calls are gated behind isNative() so the web build is unaffected.

import { isCapacitorApp } from "./notifications";

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
      sound: "default",
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
