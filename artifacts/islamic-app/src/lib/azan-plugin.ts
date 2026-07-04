// Bridge to the native AzanPlugin (registered in MainActivity via registerPlugin)
// Only active when running inside a Capacitor APK.

import { registerPlugin } from "@capacitor/core";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PrayerScheduleItem {
  id:        number;  // 1000–1019
  name:      string;  // "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha"
  timestamp: number;  // Unix ms — must be in the future
  sound:     AzanSound;
}

export interface AzanPermissions {
  notificationGranted:       boolean;
  canScheduleExact:          boolean;
  batteryOptimizationsIgnored: boolean;
}

export type AzanSound = "default" | "makkah" | "madinah" | "mishary";

// ── Internal native interface ─────────────────────────────────────────────────

interface AzanNative {
  schedulePrayer(options: PrayerScheduleItem): Promise<{ scheduled: boolean }>;
  cancelPrayer(options: { id: number }):       Promise<void>;
  cancelAll():                                  Promise<void>;
  checkPermissions():                           Promise<AzanPermissions>;
  openAlarmSettings():                          Promise<void>;
  requestBatteryOptimizationExemption():        Promise<void>;
  savePrayerTimes(options: { prayers: PrayerScheduleItem[] }): Promise<void>;
}

// registerPlugin() returns a no-op web implementation automatically when
// running in the browser — safe to call unconditionally.
const _native = registerPlugin<AzanNative>("Azan");

// ── Public API ────────────────────────────────────────────────────────────────

export async function azanSchedulePrayer(item: PrayerScheduleItem): Promise<boolean> {
  try {
    const result = await _native.schedulePrayer(item);
    return result.scheduled ?? true;
  } catch {
    return false;
  }
}

export async function azanCancelPrayer(id: number): Promise<void> {
  try { await _native.cancelPrayer({ id }); } catch { /* */ }
}

export async function azanCancelAll(): Promise<void> {
  try { await _native.cancelAll(); } catch { /* */ }
}

export async function azanCheckPermissions(): Promise<AzanPermissions> {
  try {
    return await _native.checkPermissions();
  } catch {
    return { 
      notificationGranted: false, 
      canScheduleExact: false,
      batteryOptimizationsIgnored: false 
    };
  }
}

export async function azanOpenAlarmSettings(): Promise<void> {
  try { await _native.openAlarmSettings(); } catch { /* */ }
}

export async function azanRequestBatteryOptimizationExemption(): Promise<void> {
  try { await _native.requestBatteryOptimizationExemption(); } catch { /* */ }
}

export async function azanSavePrayerTimes(prayers: PrayerScheduleItem[]): Promise<void> {
  try { await _native.savePrayerTimes({ prayers }); } catch { /* */ }
}
