import { noorApi, type NoorUser } from "./noor-api";
import {
  applyTeacherAccount,
  getPersistentDeviceId,
} from "./teacher-account";
import { getDeviceId } from "./device-identity";

export { getDeviceId } from "./device-identity";

// ── Registration ──────────────────────────────────────────────────────────────

let _registrationPromise: Promise<NoorUser | null> | null = null;

export async function ensureRegistered(): Promise<NoorUser | null> {
  if (_registrationPromise) return _registrationPromise;

  _registrationPromise = (async () => {
    const deviceId    = getDeviceId();
    const persistentDeviceId = await getPersistentDeviceId();
    try {
      const { user, teacherAccount } = await noorApi.register(
        deviceId,
        persistentDeviceId,
      );
      applyTeacherAccount(teacherAccount);
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

export async function reportPresence(): Promise<void> {
  const registered = await ensureRegistered();
  if (!registered) return;
  await noorApi.presence(getDeviceId());
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
