import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middlewares/adminAuth";
import {
  findUserById,
  updateUser,
  addCoinTransaction,
  getPendingProducts,
  getAllProductsAdmin,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../lib/sheets";
import { PROMOTION_HOURS } from "../lib/constants";

const router = Router();
router.use(requireAdmin);

router.get("/products/pending", async (_req, res) => {
  const products = await getPendingProducts();
  const withUsers = await Promise.all(
    products.map(async (product) => {
      const user = await findUserById(product.userId);
      return {
        product,
        user: user
          ? { id: user.id, deviceId: user.deviceId, coinsBalance: user.coinsBalance }
          : null,
      };
    }),
  );
  res.json({ products: withUsers });
});

router.get("/products/all", async (_req, res) => {
  const products = await getAllProductsAdmin();
  const withUsers = await Promise.all(
    products.map(async (product) => {
      const user = await findUserById(product.userId);
      return {
        product,
        user: user ? { id: user.id, deviceId: user.deviceId } : null,
      };
    }),
  );
  res.json({ products: withUsers });
});

const rejectSchema = z.object({ rejectionReason: z.string().optional() });

router.post("/products/:id/approve", async (req, res) => {
  const product = await getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (product.status !== "pending") {
    res.status(400).json({ error: `Product is already ${product.status}` });
    return;
  }

  const now = new Date();
  const hours = PROMOTION_HOURS[product.promotionType] ?? 0;
  const promotionExpiry = hours > 0
    ? new Date(now.getTime() + hours * 3600 * 1000).toISOString()
    : null;

  const updated = await updateProduct(product.id, {
    status:         "approved",
    approvedAt:     now.toISOString(),
    promotionExpiry,
  });
  res.json({ product: updated });
});

router.post("/products/:id/reject", async (req, res) => {
  const product = await getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (product.status !== "pending") {
    res.status(400).json({ error: `Product is already ${product.status}` });
    return;
  }

  const parsed = rejectSchema.safeParse(req.body);
  const updated = await updateProduct(product.id, {
    status:          "rejected",
    rejectedAt:      new Date().toISOString(),
    rejectionReason: parsed.success ? (parsed.data.rejectionReason ?? null) : null,
  });

  if (product.coinsSpent > 0) {
    const user = await findUserById(product.userId);
    if (user) {
      await updateUser(user.id, { coinsBalance: user.coinsBalance + product.coinsSpent });
      await addCoinTransaction({
        userId:   user.id,
        amount:   product.coinsSpent,
        reason:   `Refund — product rejected: "${product.title}"`,
        eventKey: `refund_rejected_${product.id}`,
      });
    }
  }

  res.json({ product: updated, coinsRefunded: product.coinsSpent });
});

router.delete("/products/:id", async (req, res) => {
  const product = await getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  await deleteProduct(product.id);
  res.json({ deleted: true });
});

export default router;
