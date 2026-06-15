import { Router } from "express";
import { z } from "zod";
import {
  findUserByDeviceId,
  findUserById,
  createUser,
  updateUser,
  addCoinTransaction,
  addReferral,
  hasReferral,
  getUserTransactions,
  getUserProducts,
} from "../lib/sheets";

const router = Router();

const WELCOME_COINS      = 20;
const REFERRAL_NEW_COINS = 20;
const REFERRAL_REF_COINS = 100;

const registerSchema = z.object({
  deviceId:     z.string().min(1).max(200),
  referredById: z.string().uuid().optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { deviceId, referredById } = parsed.data;

  const existing = await findUserByDeviceId(deviceId);
  if (existing) {
    res.json({ user: existing, isNew: false });
    return;
  }

  let validReferrer = null;
  if (referredById) {
    validReferrer = await findUserById(referredById);
  }

  const newUser = await createUser({
    deviceId,
    coinsBalance:     WELCOME_COINS,
    totalCoinsEarned: WELCOME_COINS,
    totalReferrals:   0,
    referredById:     validReferrer ? validReferrer.id : null,
  });

  await addCoinTransaction({
    userId:   newUser.id,
    amount:   WELCOME_COINS,
    reason:   "New user welcome bonus",
    eventKey: "new_user_bonus",
  });

  if (validReferrer) {
    const alreadyReferred = await hasReferral(newUser.id);
    if (!alreadyReferred) {
      await addReferral(validReferrer.id, newUser.id);

      await updateUser(validReferrer.id, {
        coinsBalance:     validReferrer.coinsBalance + REFERRAL_REF_COINS,
        totalCoinsEarned: validReferrer.totalCoinsEarned + REFERRAL_REF_COINS,
        totalReferrals:   validReferrer.totalReferrals + 1,
      });
      await addCoinTransaction({
        userId:   validReferrer.id,
        amount:   REFERRAL_REF_COINS,
        reason:   "Referral reward — friend joined",
        eventKey: `referral_reward_${newUser.id}`,
      });

      if (REFERRAL_NEW_COINS > 0) {
        await updateUser(newUser.id, {
          coinsBalance:     newUser.coinsBalance + REFERRAL_NEW_COINS,
          totalCoinsEarned: newUser.totalCoinsEarned + REFERRAL_NEW_COINS,
        });
        await addCoinTransaction({
          userId:   newUser.id,
          amount:   REFERRAL_NEW_COINS,
          reason:   "Referral join bonus",
          eventKey: "referral_join_bonus",
        });
      }
    }
  }

  const fresh = await findUserById(newUser.id);
  res.status(201).json({ user: fresh ?? newUser, isNew: true });
});

router.get("/:deviceId/profile", async (req, res) => {
  const user = await findUserByDeviceId(req.params.deviceId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [allProducts, recentTransactions] = await Promise.all([
    getUserProducts(user.id),
    getUserTransactions(user.id, 20),
  ]);

  const now = new Date().toISOString();
  const stats = {
    totalProducts:    allProducts.length,
    pendingProducts:  allProducts.filter((p) => p.status === "pending").length,
    rejectedProducts: allProducts.filter((p) => p.status === "rejected").length,
    activePromotions: allProducts.filter(
      (p) =>
        p.status === "approved" &&
        p.promotionType !== "none" &&
        !!p.promotionExpiry &&
        p.promotionExpiry > now,
    ).length,
  };

  res.json({ user, stats, recentTransactions });
});

export default router;
