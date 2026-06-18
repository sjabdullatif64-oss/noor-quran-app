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
  createProduct,
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

const adminCreateSchema = z.object({
  title:       z.string().min(2).max(200),
  description: z.string().min(5).max(2000),
  imageUrl:    z.string().max(2_000_000).optional().or(z.literal("")),
  contactInfo: z.string().min(2).max(500),
  productLink: z.string().url().optional().or(z.literal("")),
  category:    z.enum(["tasbeeh", "prayer_mat", "books", "attar", "courses", "other"]),
  submittedBy: z.string().max(100).optional(),
  featured:    z.boolean().default(false),
});

router.post("/products", async (req, res) => {
  const parsed = adminCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { imageUrl, productLink, featured, submittedBy, ...fields } = parsed.data;
  const now = new Date();
  const promotionType = featured ? "7day" : "none";
  const promotionExpiry = featured
    ? new Date(now.getTime() + 365 * 24 * 3600 * 1000).toISOString()
    : null;
  const product = await createProduct({
    userId:          "admin",
    title:           fields.title,
    description:     fields.description,
    imageUrl:        imageUrl || null,
    contactInfo:     fields.contactInfo,
    productLink:     productLink || null,
    category:        fields.category,
    status:          "approved",
    promotionType,
    coinsSpent:      0,
    submittedBy:     submittedBy ?? null,
    approvedAt:      now.toISOString(),
    rejectedAt:      null,
    rejectionReason: null,
    promotionExpiry,
  });
  res.status(201).json({ product });
});

const featureSchema = z.object({ featured: z.boolean() });

router.post("/products/:id/feature", async (req, res) => {
  const product = await getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const parsed = featureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { featured } = parsed.data;
  const now = new Date();
  const promotionType = featured ? "7day" : "none";
  const promotionExpiry = featured
    ? new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString()
    : null;
  const updated = await updateProduct(product.id, {
    promotionType,
    promotionExpiry,
    ...(product.status !== "approved"
      ? { status: "approved", approvedAt: now.toISOString() }
      : {}),
  });
  res.json({ product: updated });
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

const adminEditSchema = z.object({
  title:       z.string().min(2).max(200).optional(),
  description: z.string().min(5).max(2000).optional(),
  imageUrl:    z.string().max(2_000_000).optional().or(z.literal("")),
  contactInfo: z.string().min(2).max(500).optional(),
  productLink: z.string().url().optional().or(z.literal("")),
  category:    z.enum(["tasbeeh", "prayer_mat", "books", "attar", "courses", "other"]).optional(),
  submittedBy: z.string().max(100).optional(),
});

router.patch("/products/:id", async (req, res) => {
  const product = await getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const parsed = adminEditSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { imageUrl, productLink, ...fields } = parsed.data;
  const updates: Parameters<typeof updateProduct>[1] = { ...fields };
  if (imageUrl !== undefined) updates.imageUrl = imageUrl || null;
  if (productLink !== undefined) updates.productLink = productLink || null;
  const updated = await updateProduct(product.id, updates);
  res.json({ product: updated });
});

export default router;
