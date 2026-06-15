import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, coinTransactionsTable, referralsTable, productsTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function generateReferralCode(deviceId: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const hex = deviceId.replace(/-/g, "");
  let code = "";
  for (let i = 0; i < 8; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    code += chars[byte % chars.length];
  }
  return code;
}

async function ensureUniqueCode(base: string, deviceId: string): Promise<string> {
  let code = base;
  let suffix = 0;
  while (true) {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, code))
      .limit(1);
    if (existing.length === 0) return code;
    suffix++;
    code = base.slice(0, 6) + suffix.toString().padStart(2, "0");
  }
}

const registerSchema = z.object({
  deviceId: z.string().min(1).max(200),
  referralCode: z.string().optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { deviceId, referralCode } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.deviceId, deviceId))
    .limit(1);

  if (existing.length > 0) {
    res.json({ user: existing[0], isNew: false });
    return;
  }

  const baseCode = generateReferralCode(deviceId);
  const uniqueCode = await ensureUniqueCode(baseCode, deviceId);

  let referredById: string | null = null;
  if (referralCode) {
    const referrer = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCode.toUpperCase()))
      .limit(1);
    if (referrer.length > 0) {
      referredById = referrer[0].id;
    }
  }

  const NEW_USER_COINS = 20;
  const REFERRAL_NEW_USER_COINS = 0;
  const REFERRAL_REFERRER_COINS = 100;

  const [newUser] = await db
    .insert(usersTable)
    .values({
      deviceId,
      referralCode: uniqueCode,
      referredById: referredById ?? undefined,
      coinsBalance: NEW_USER_COINS,
      totalCoinsEarned: NEW_USER_COINS,
    })
    .returning();

  await db.insert(coinTransactionsTable).values({
    userId: newUser.id,
    amount: NEW_USER_COINS,
    reason: "New user bonus",
    eventKey: "new_user_bonus",
  });

  if (referredById) {
    await db.insert(referralsTable).values({
      referrerId: referredById,
      refereeId: newUser.id,
    }).onConflictDoNothing();

    const [referrer] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, referredById))
      .limit(1);

    if (referrer) {
      await db
        .update(usersTable)
        .set({
          coinsBalance: referrer.coinsBalance + REFERRAL_REFERRER_COINS,
          totalCoinsEarned: referrer.totalCoinsEarned + REFERRAL_REFERRER_COINS,
          totalReferrals: referrer.totalReferrals + 1,
        })
        .where(eq(usersTable.id, referredById));

      await db.insert(coinTransactionsTable).values({
        userId: referredById,
        amount: REFERRAL_REFERRER_COINS,
        reason: `Referral bonus — new user joined`,
        eventKey: `referral_reward_${newUser.id}`,
      });
    }

    if (REFERRAL_NEW_USER_COINS > 0) {
      await db
        .update(usersTable)
        .set({
          coinsBalance: newUser.coinsBalance + REFERRAL_NEW_USER_COINS,
          totalCoinsEarned: newUser.totalCoinsEarned + REFERRAL_NEW_USER_COINS,
        })
        .where(eq(usersTable.id, newUser.id));

      await db.insert(coinTransactionsTable).values({
        userId: newUser.id,
        amount: REFERRAL_NEW_USER_COINS,
        reason: "Referral join bonus",
        eventKey: "referral_join_bonus",
      });
    }
  }

  const [freshUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, newUser.id))
    .limit(1);

  res.status(201).json({ user: freshUser, isNew: true });
});

router.get("/:deviceId/profile", async (req, res) => {
  const { deviceId } = req.params;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.deviceId, deviceId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [{ total: totalProducts }] = await db
    .select({ total: count() })
    .from(productsTable)
    .where(eq(productsTable.userId, user.id));

  const allProducts = await db
    .select({ status: productsTable.status, promotionType: productsTable.promotionType, promotionExpiry: productsTable.promotionExpiry })
    .from(productsTable)
    .where(eq(productsTable.userId, user.id));

  const now = new Date();
  const pendingCount = allProducts.filter((p) => p.status === "pending").length;
  const rejectedCount = allProducts.filter((p) => p.status === "rejected").length;
  const activePromotions = allProducts.filter(
    (p) =>
      p.status === "approved" &&
      p.promotionType !== "none" &&
      p.promotionExpiry != null &&
      new Date(p.promotionExpiry) > now
  ).length;

  const recentTx = await db
    .select()
    .from(coinTransactionsTable)
    .where(eq(coinTransactionsTable.userId, user.id))
    .orderBy(desc(coinTransactionsTable.createdAt))
    .limit(20);

  res.json({
    user,
    stats: {
      totalProducts: Number(totalProducts),
      pendingProducts: pendingCount,
      rejectedProducts: rejectedCount,
      activePromotions,
    },
    recentTransactions: recentTx,
  });
});

export default router;
