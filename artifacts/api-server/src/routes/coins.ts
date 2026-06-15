import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, coinTransactionsTable, ayahRewardsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const DAILY_CHECKIN_COINS = 5;
const AYAH_REWARD_COINS = 1;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getUser(deviceId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.deviceId, deviceId))
    .limit(1);
  return user ?? null;
}

async function addCoins(
  userId: string,
  amount: number,
  reason: string,
  eventKey?: string
) {
  const [user] = await db
    .select({ coinsBalance: usersTable.coinsBalance, totalEarned: usersTable.totalCoinsEarned })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");

  const newBalance = Math.max(0, user.coinsBalance + amount);
  const newEarned = amount > 0 ? user.totalEarned + amount : user.totalEarned;

  await db
    .update(usersTable)
    .set({ coinsBalance: newBalance, totalCoinsEarned: newEarned })
    .where(eq(usersTable.id, userId));

  await db.insert(coinTransactionsTable).values({
    userId,
    amount,
    reason,
    eventKey: eventKey ?? null,
  });

  return newBalance;
}

router.post("/daily-checkin", async (req, res) => {
  const { deviceId } = req.body ?? {};
  if (!deviceId) {
    res.status(400).json({ error: "deviceId required" });
    return;
  }

  const user = await getUser(deviceId);
  if (!user) {
    res.status(404).json({ error: "User not found — register first" });
    return;
  }

  const todayEventKey = `daily_checkin_${todayKey()}`;
  const alreadyCheckedIn = await db
    .select({ id: coinTransactionsTable.id })
    .from(coinTransactionsTable)
    .where(
      and(
        eq(coinTransactionsTable.userId, user.id),
        eq(coinTransactionsTable.eventKey, todayEventKey)
      )
    )
    .limit(1);

  if (alreadyCheckedIn.length > 0) {
    res.json({ awarded: false, coins: user.coinsBalance, message: "Already checked in today" });
    return;
  }

  const newBalance = await addCoins(
    user.id,
    DAILY_CHECKIN_COINS,
    "Daily check-in",
    todayEventKey
  );

  res.json({ awarded: true, coins: newBalance, amount: DAILY_CHECKIN_COINS });
});

const ayahRewardSchema = z.object({
  deviceId: z.string().min(1),
  surahNumber: z.coerce.number().int().min(1).max(114),
  ayahNumber: z.coerce.number().int().min(1),
});

router.post("/ayah-reward", async (req, res) => {
  const parsed = ayahRewardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { deviceId, surahNumber, ayahNumber } = parsed.data;

  const user = await getUser(deviceId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const alreadyRewarded = await db
    .select({ id: ayahRewardsTable.id })
    .from(ayahRewardsTable)
    .where(
      and(
        eq(ayahRewardsTable.userId, user.id),
        eq(ayahRewardsTable.surahNumber, surahNumber),
        eq(ayahRewardsTable.ayahNumber, ayahNumber)
      )
    )
    .limit(1);

  if (alreadyRewarded.length > 0) {
    res.json({ awarded: false, coins: user.coinsBalance, message: "Ayah already rewarded" });
    return;
  }

  await db.insert(ayahRewardsTable).values({
    userId: user.id,
    surahNumber,
    ayahNumber,
  });

  const newBalance = await addCoins(
    user.id,
    AYAH_REWARD_COINS,
    `Quran listening reward — ${surahNumber}:${ayahNumber}`,
    `ayah_${surahNumber}_${ayahNumber}`
  );

  res.json({ awarded: true, coins: newBalance, amount: AYAH_REWARD_COINS });
});

export default router;
