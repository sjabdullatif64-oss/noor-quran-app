import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  productsTable,
  coinTransactionsTable,
  PROMOTION_COINS,
} from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const submitProductSchema = z.object({
  deviceId:      z.string().min(1),
  title:         z.string().min(2).max(200),
  description:   z.string().min(5).max(2000),
  imageUrl:      z.string().max(2_000_000).optional().or(z.literal("")),
  contactInfo:   z.string().min(2).max(500),
  productLink:   z.string().url().optional().or(z.literal("")),
  category:      z.enum(["tasbeeh", "prayer_mat", "books", "attar", "courses", "other"]),
  promotionType: z.enum(["none", "1day", "7day"]).default("none"),
  submittedBy:   z.string().max(100).optional(),
});

router.get("/", async (_req, res) => {
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.status, "approved"))
    .orderBy(desc(productsTable.approvedAt));
  res.json({ products });
});

router.get("/featured", async (_req, res) => {
  const now = new Date();
  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.status, "approved"),
        gt(productsTable.promotionExpiry, now)
      )
    )
    .orderBy(desc(productsTable.promotionExpiry));
  res.json({ products });
});

router.get("/my/:deviceId", async (req, res) => {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.deviceId, req.params.deviceId))
    .limit(1);

  if (!user) {
    res.json({ products: [] });
    return;
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.userId, user.id))
    .orderBy(desc(productsTable.createdAt));

  res.json({ products });
});

router.post("/", async (req, res) => {
  const parsed = submitProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { deviceId, promotionType, ...fields } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.deviceId, deviceId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found — register first" });
    return;
  }

  const coinsNeeded = PROMOTION_COINS[promotionType];

  if (coinsNeeded > 0 && user.coinsBalance < coinsNeeded) {
    res.status(402).json({
      error: "Insufficient coins",
      required: coinsNeeded,
      balance: user.coinsBalance,
    });
    return;
  }

  if (coinsNeeded > 0) {
    await db
      .update(usersTable)
      .set({ coinsBalance: user.coinsBalance - coinsNeeded })
      .where(eq(usersTable.id, user.id));

    await db.insert(coinTransactionsTable).values({
      userId:   user.id,
      amount:   -coinsNeeded,
      reason:   `Promotion purchase — ${promotionType} plan`,
      eventKey: `promo_purchase_${Date.now()}`,
    });
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      userId:       user.id,
      title:        fields.title,
      description:  fields.description,
      imageUrl:     fields.imageUrl || null,
      contactInfo:  fields.contactInfo,
      productLink:  fields.productLink || null,
      category:     fields.category,
      status:       "pending",
      promotionType,
      coinsSpent:   coinsNeeded,
      submittedBy:  fields.submittedBy ?? null,
    })
    .returning();

  res.status(201).json({ product });
});

export default router;
