import { Router } from "express";
import { requireAdmin } from "../middlewares/adminAuth";
import { db } from "@workspace/db";
import {
  productsTable,
  usersTable,
  coinTransactionsTable,
  PROMOTION_HOURS,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();
router.use(requireAdmin);

router.get("/products/pending", async (_req, res) => {
  const pending = await db
    .select({
      product: productsTable,
      user: {
        id: usersTable.id,
        deviceId: usersTable.deviceId,
        referralCode: usersTable.referralCode,
        coinsBalance: usersTable.coinsBalance,
      },
    })
    .from(productsTable)
    .leftJoin(usersTable, eq(productsTable.userId, usersTable.id))
    .where(eq(productsTable.status, "pending"))
    .orderBy(desc(productsTable.createdAt));

  res.json({ products: pending });
});

router.get("/products/all", async (_req, res) => {
  const all = await db
    .select({
      product: productsTable,
      user: {
        id: usersTable.id,
        deviceId: usersTable.deviceId,
        referralCode: usersTable.referralCode,
      },
    })
    .from(productsTable)
    .leftJoin(usersTable, eq(productsTable.userId, usersTable.id))
    .orderBy(desc(productsTable.createdAt));

  res.json({ products: all });
});

const approveSchema = z.object({
  rejectionReason: z.string().optional(),
});

router.post("/products/:id/approve", async (req, res) => {
  const { id } = req.params;
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (product.status !== "pending") {
    res.status(400).json({ error: `Product is already ${product.status}` });
    return;
  }

  const now = new Date();
  const promoType = product.promotionType as keyof typeof PROMOTION_HOURS;
  const hours = PROMOTION_HOURS[promoType] ?? 0;
  const promotionExpiry =
    hours > 0
      ? new Date(now.getTime() + hours * 60 * 60 * 1000)
      : null;

  const [updated] = await db
    .update(productsTable)
    .set({
      status: "approved",
      approvedAt: now,
      promotionExpiry: promotionExpiry ?? undefined,
    })
    .where(eq(productsTable.id, id))
    .returning();

  res.json({ product: updated });
});

router.post("/products/:id/reject", async (req, res) => {
  const { id } = req.params;
  const parsed = approveSchema.safeParse(req.body);

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (product.status !== "pending") {
    res.status(400).json({ error: `Product is already ${product.status}` });
    return;
  }

  const [updated] = await db
    .update(productsTable)
    .set({
      status: "rejected",
      rejectedAt: new Date(),
      rejectionReason: parsed.success ? (parsed.data.rejectionReason ?? null) : null,
    })
    .where(eq(productsTable.id, id))
    .returning();

  if (product.coinsSpent > 0) {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, product.userId))
      .limit(1);

    if (user) {
      await db
        .update(usersTable)
        .set({ coinsBalance: user.coinsBalance + product.coinsSpent })
        .where(eq(usersTable.id, user.id));

      await db.insert(coinTransactionsTable).values({
        userId: user.id,
        amount: product.coinsSpent,
        reason: `Refund — product rejected: "${product.title}"`,
        eventKey: `refund_rejected_${id}`,
      });
    }
  }

  res.json({ product: updated, coinsRefunded: product.coinsSpent });
});

router.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ deleted: true });
});

export default router;
