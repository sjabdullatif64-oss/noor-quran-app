import { noorApi, type NoorUser } from "./noor-api";

const DEVICE_ID_KEY = "noor-device-id";
const USER_CACHE_KEY = "noor-user-cache";
const COINS_CACHE_KEY = "noor-coins-v1";

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

export function getCachedUser(): NoorUser | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as NoorUser) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: NoorUser) {
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    localStorage.setItem(
      COINS_CACHE_KEY,
      JSON.stringify({ total: user.coinsBalance, today: "", todayEvents: [] })
    );
  } catch {}
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
      setCachedUser(user);
      return user;
    } catch (err) {
      console.warn("[Noor] User registration failed:", err);
      return getCachedUser();
    }
  })();

  return _registrationPromise;
}

export async function refreshProfile(): Promise<NoorUser | null> {
  const deviceId = getDeviceId();
  try {
    const { user } = await noorApi.getProfile(deviceId);
    setCachedUser(user);
    return user;
  } catch {
    return getCachedUser();
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
    const result = await noorApi.dailyCheckin(deviceId);
    if (result.awarded) {
      const cached = getCachedUser();
      if (cached) setCachedUser({ ...cached, coinsBalance: result.coins });
    }
    return result;
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
    const result = await noorApi.ayahReward(deviceId, surahNumber, ayahNumber);
    if (result.awarded) {
      const cached = getCachedUser();
      if (cached) setCachedUser({ ...cached, coinsBalance: result.coins });
    }
  } catch {
    // Silent — rewards are optional
  }
}

export function getCachedCoins(): number {
  try {
    const raw = localStorage.getItem(COINS_CACHE_KEY);
    const store = raw ? JSON.parse(raw) : null;
    return (store as { total?: number })?.total ?? 0;
  } catch {
    return 0;
  }
}
