// Noor Quran — Reward Coins System
// Earned automatically by reading Quran, completing habits, daily visits, etc.

const KEY = "noor-coins-v1";

interface CoinStore {
  total: number;
  today: string;      // YYYY-MM-DD — prevents multi-earn on same day
  todayEvents: string[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): CoinStore {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { total: 0, today: "", todayEvents: [] };
  } catch {
    return { total: 0, today: "", todayEvents: [] };
  }
}

function save(s: CoinStore) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function getCoins(): number {
  return load().total;
}

/** Award coins for an event (once per day per eventId). Returns new total, or -1 if already awarded today. */
export function awardCoins(eventId: string, amount: number): number {
  const s = load();
  const t = today();
  if (s.today === t && s.todayEvents.includes(eventId)) return -1; // already awarded
  const todayEvents = s.today === t ? [...s.todayEvents, eventId] : [eventId];
  const next: CoinStore = { total: s.total + amount, today: t, todayEvents };
  save(next);
  return next.total;
}

/** Force-add coins without event-dedup (e.g., completing a habit). */
export function addCoins(amount: number): number {
  const s = load();
  const next = { ...s, total: s.total + amount };
  save(next);
  return next.total;
}

export const COIN_EVENTS: Record<string, number> = {
  daily_visit:    5,
  quran_surah:    10,
  habit_complete: 3,
  goal_progress:  5,
  goal_complete:  50,
  tasbeeh_100:    5,
  hadith_read:    2,
};
