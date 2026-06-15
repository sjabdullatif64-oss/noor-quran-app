import { noorApi, type NoorUser } from "./noor-api";

const DEVICE_ID_KEY = "noor-device-id";

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

let _registrationPromise: Promise<NoorUser | null> | null = null;

export async function ensureRegistered(
  referralCode?: string
): Promise<NoorUser | null> {
  if (_registrationPromise) return _registrationPromise;

  _registrationPromise = (async () => {
    const deviceId = getDeviceId();
    try {
      const { user } = await noorApi.register(deviceId, referralCode);
      return user;
    } catch (err) {
      console.warn("[Noor] User registration failed:", err);
      return null;
    }
  })();

  return _registrationPromise;
}

export async function refreshProfile(): Promise<NoorUser | null> {
  const deviceId = getDeviceId();
  try {
    const { user } = await noorApi.getProfile(deviceId);
    return user;
  } catch {
    return null;
  }
}

export async function doDailyCheckin(): Promise<{
  awarded: boolean;
  coins: number;
  amount?: number;
  message?: string;
}> {
  const deviceId = getDeviceId();
  try {
    return await noorApi.dailyCheckin(deviceId);
  } catch (err) {
    console.warn("[Noor] Daily checkin failed:", err);
    return { awarded: false, coins: 0 };
  }
}

export async function reportAyahComplete(
  surahNumber: number,
  ayahNumber: number
): Promise<void> {
  const deviceId = getDeviceId();
  try {
    await noorApi.ayahReward(deviceId, surahNumber, ayahNumber);
  } catch {
    // Silent — rewards are optional
  }
}
