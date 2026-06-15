import { Router } from "express";
import { z } from "zod";
import {
  findUserByDeviceId,
  addCoins,
  hasCheckedInToday,
  recordCheckin,
  hasAyahReward,
  countTodayAyahRewards,
  addAyahReward,
} from "../lib/sheets";

const router = Router();

const DAILY_CHECKIN_COINS = 5;
const AYAH_REWARD_COINS   = 1;
const DAILY_AYAH_LIMIT    = 20;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

router.post("/daily-checkin", async (req, res) => {
  const { deviceId } = req.body ?? {};
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }

  const user = await findUserByDeviceId(deviceId as string);
  if (!user) {
    res.status(404).json({ error: "User not found — register first" });
    return;
  }

  const today = todayStr();
  const alreadyDone = await hasCheckedInToday(user.id, today);
  if (alreadyDone) {
    res.json({ awarded: false, coins: user.coinsBalance, message: "Already checked in today" });
    return;
  }

  await recordCheckin(user.id, today);
  const newBalance = await addCoins(
    user.id,
    DAILY_CHECKIN_COINS,
    "Daily check-in",
    `daily_checkin_${today}`,
  );
  res.json({ awarded: true, coins: newBalance, amount: DAILY_CHECKIN_COINS });
});

const ayahSchema = z.object({
  deviceId:    z.string().min(1),
  surahNumber: z.coerce.number().int().min(1).max(114),
  ayahNumber:  z.coerce.number().int().min(1),
});

router.post("/ayah-reward", async (req, res) => {
  const parsed = ayahSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { deviceId, surahNumber, ayahNumber } = parsed.data;

  const user = await findUserByDeviceId(deviceId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const already = await hasAyahReward(user.id, surahNumber, ayahNumber);
  if (already) {
    res.json({ awarded: false, coins: user.coinsBalance, message: "Ayah already rewarded" });
    return;
  }

  const today = todayStr();
  const todayCount = await countTodayAyahRewards(user.id, today);
  if (todayCount >= DAILY_AYAH_LIMIT) {
    res.json({ awarded: false, coins: user.coinsBalance, message: "Daily ayah reward limit reached (20/day)" });
    return;
  }

  await addAyahReward(user.id, surahNumber, ayahNumber, today);
  const newBalance = await addCoins(
    user.id,
    AYAH_REWARD_COINS,
    `Quran listening reward — ${surahNumber}:${ayahNumber}`,
    `ayah_${surahNumber}_${ayahNumber}`,
  );
  res.json({ awarded: true, coins: newBalance, amount: AYAH_REWARD_COINS });
});

export default router;
