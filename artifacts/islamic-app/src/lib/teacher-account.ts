import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import {
  TEACHER_PRACTICE_KEY,
  TEACHER_PROGRESS_KEY,
} from "./teacher-config";
import { noorApi, type NoorTeacherAccount } from "./noor-api";
import { getDeviceId } from "./device-identity";

const TEACHER_ACCOUNT_ID_KEY = "noor-teacher-account-id";
const TEACHER_RECOVERY_KEY = "noor-teacher-recovery-key";

let activeAccount: NoorTeacherAccount | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function getPersistentDeviceId(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return `web:${getDeviceId()}`;
  try {
    const { identifier } = await Device.getId();
    if (identifier) return `native:${identifier}`;
  } catch (error) {
    console.warn("[Noor] Native device identity unavailable:", error);
  }
  return `web:${getDeviceId()}`;
}

export function getStoredTeacherRecoveryKey(): string {
  try {
    return localStorage.getItem(TEACHER_RECOVERY_KEY) ?? "";
  } catch {
    return "";
  }
}

function readJson(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function collectTeacherStorage(): Record<string, string> {
  const storage: Record<string, string> = {};
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (
        key &&
        key.startsWith("noor-teacher-") &&
        key !== TEACHER_ACCOUNT_ID_KEY &&
        key !== TEACHER_RECOVERY_KEY
      ) {
        const value = localStorage.getItem(key);
        if (value !== null) storage[key] = value;
      }
    }
  } catch {
    // Return whatever was readable; local storage is optional.
  }
  return storage;
}

function writeJson(key: string, value: Record<string, unknown>): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* non-fatal */ }
}

function notifyTeacherHydrated(): void {
  window.dispatchEvent(new Event("noor:teacher-progress-changed"));
}

function saveAccountIdentity(account: NoorTeacherAccount): void {
  activeAccount = account;
  try {
    localStorage.setItem(TEACHER_ACCOUNT_ID_KEY, account.id);
    localStorage.setItem(TEACHER_RECOVERY_KEY, account.recoveryKey);
  } catch { /* local storage is optional; the server remains authoritative */ }
  window.dispatchEvent(new Event("noor:teacher-account-ready"));
}

/**
 * Load server state only when there is no local copy. This preserves the
 * existing offline-first Teacher flow while restoring data after a reinstall
 * or cleared app data.
 */
export function applyTeacherAccount(
  account: NoorTeacherAccount,
  options: { overwrite?: boolean } = {},
): void {
  saveAccountIdentity(account);
  const snapshot = account.account ?? {};
  const storage = snapshot.storage;
  const progress = snapshot.progress;
  const practice = snapshot.practice;

  try {
    if (options.overwrite) {
      for (let index = localStorage.length - 1; index >= 0; index--) {
        const key = localStorage.key(index);
        if (
          key &&
          key.startsWith("noor-teacher-") &&
          key !== TEACHER_ACCOUNT_ID_KEY &&
          key !== TEACHER_RECOVERY_KEY
        ) {
          localStorage.removeItem(key);
        }
      }
      if (storage && typeof storage === "object" && !Array.isArray(storage)) {
        for (const [key, value] of Object.entries(storage as Record<string, unknown>)) {
          if (key.startsWith("noor-teacher-") && typeof value === "string") {
            localStorage.setItem(key, value);
          }
        }
      }
    }
    const hasLocalProgress = Boolean(localStorage.getItem(TEACHER_PROGRESS_KEY));
    const hasLocalPractice = Boolean(localStorage.getItem(TEACHER_PRACTICE_KEY));
    if ((options.overwrite || !hasLocalProgress) && progress && typeof progress === "object") {
      const restored = { ...(progress as Record<string, unknown>), learnerId: getDeviceId() };
      writeJson(TEACHER_PROGRESS_KEY, restored);
    }
    if ((options.overwrite || !hasLocalPractice) && practice && typeof practice === "object") {
      writeJson(TEACHER_PRACTICE_KEY, practice as Record<string, unknown>);
    }
  } catch {
    // Storage failures do not invalidate the server identity.
  }
  notifyTeacherHydrated();
  if (Object.keys(collectTeacherStorage()).length > 0) {
    queueTeacherAccountSave();
  }
}

function currentSnapshot(): {
  storage: Record<string, string>;
  progress: Record<string, unknown> | null;
  practice: Record<string, unknown> | null;
} {
  return {
    storage: collectTeacherStorage(),
    progress: readJson(TEACHER_PROGRESS_KEY),
    practice: readJson(TEACHER_PRACTICE_KEY),
  };
}

export function queueTeacherAccountSave(): void {
  if (!activeAccount) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const account = activeAccount;
    if (!account) return;
    const { storage, progress, practice } = currentSnapshot();
    noorApi.saveTeacherAccount(
      getDeviceId(),
      account.recoveryKey,
      storage,
      progress,
      practice,
    ).then(({ teacherAccount }) => {
      activeAccount = teacherAccount;
    }).catch((error) => {
      console.warn("[Noor] Teacher account sync failed:", error);
    });
  }, 700);
}

export async function restoreTeacherAccount(recoveryKey: string): Promise<void> {
  const normalized = recoveryKey.trim().toUpperCase();
  const { teacherAccount } = await noorApi.restoreTeacherAccount(getDeviceId(), normalized);
  applyTeacherAccount(teacherAccount, { overwrite: true });
  queueTeacherAccountSave();
}