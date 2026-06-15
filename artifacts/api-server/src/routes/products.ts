import { Router } from "express";
import { z } from "zod";
import {
  findUserByDeviceId,
  updateUser,
  addCoinTransaction,
  getApprovedProducts,
  getFeaturedProducts,
  getUserProducts,
  createProduct,
  getProductById,
  updateProduct,
} from "../lib/sheets";
import { PROMOTION_COINS } from "../lib/constants";

const router = Router();

const submitSchema = z.object({
  deviceId:      z.string().min(1),
  title:         z.string().min(2).max(200),
  description:   z.string().min(5).max(2000),
  imageUrl:      z.string().max(2_000_000).optional().or(z.literal("")),
  contactInfo:   z.string().min(2).max(500),
  productLink:   z.string().url().optional().or(z.literal("")),
  category:      z.enum(["tasbeeh", "prayer_mat", "books", "attar", "courses", "other"]),
  promotionType: z.enum(["1day", "7day"]).default("1day"),
  submittedBy:   z.string().max(100).optional(),
});

const ownerEditSchema = z.object({
  deviceId:    z.string().min(1),
  title:       z.string().min(2).max(200).optional(),
  description: z.string().min(5).max(2000).optional(),
  imageUrl:    z.string().max(2_000_000).optional().or(z.literal("")),
  contactInfo: z.string().min(2).max(500).optional(),
  productLink: z.string().url().optional().or(z.literal("")),
  category:    z.enum(["tasbeeh", "prayer_mat", "books", "attar", "courses", "other"]).optional(),
});

router.get("/", async (_req, res) => {
  const products = await getApprovedProducts();
  res.json({ products });
});

router.get("/featured", async (_req, res) => {
  const products = await getFeaturedProducts();
  res.json({ products });
});

router.get("/my/:deviceId", async (req, res) => {
  const user = await findUserByDeviceId(req.params.deviceId);
  if (!user) {
    res.json({ products: [] });
    return;
  }
  const products = await getUserProducts(user.id);
  res.json({ products });
});

router.get("/:id", async (req, res) => {
  const product = await getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({ product });
});

router.post("/", async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { deviceId, promotionType, imageUrl, productLink, ...fields } = parsed.data;

  const user = await findUserByDeviceId(deviceId);
  if (!user) {
    res.status(404).json({ error: "User not found — register first" });
    return;
  }

  const coinsNeeded = PROMOTION_COINS[promotionType];
  if (coinsNeeded > 0 && user.coinsBalance < coinsNeeded) {
    res.status(402).json({ error: "Insufficient coins", required: coinsNeeded, balance: user.coinsBalance });
    return;
  }

  if (coinsNeeded > 0) {
    await updateUser(user.id, { coinsBalance: user.coinsBalance - coinsNeeded });
    await addCoinTransaction({
      userId:   user.id,
      amount:   -coinsNeeded,
      reason:   `Promotion purchase — ${promotionType} plan`,
      eventKey: `promo_purchase_${Date.now()}`,
    });
  }

  const product = await createProduct({
    userId:          user.id,
    title:           fields.title,
    description:     fields.description,
    imageUrl:        imageUrl || null,
    contactInfo:     fields.contactInfo,
    productLink:     productLink || null,
    category:        fields.category,
    status:          "pending",
    promotionType,
    coinsSpent:      coinsNeeded,
    submittedBy:     fields.submittedBy ?? null,
    approvedAt:      null,
    rejectedAt:      null,
    rejectionReason: null,
    promotionExpiry: null,
  });

  res.status(201).json({ product });
});

router.patch("/:id", async (req, res) => {
  const parsed = ownerEditSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { deviceId, imageUrl, productLink, ...fields } = parsed.data;

  const product = await getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const user = await findUserByDeviceId(deviceId);
  if (!user || user.id !== product.userId) {
    res.status(403).json({ error: "Not authorized to edit this product" });
    return;
  }

  const updates: Parameters<typeof updateProduct>[1] = {
    ...fields,
    status:          "pending",
    approvedAt:      null,
    rejectedAt:      null,
    rejectionReason: null,
    promotionExpiry: null,
  };
  if (imageUrl !== undefined) updates.imageUrl = imageUrl || null;
  if (productLink !== undefined) updates.productLink = productLink || null;

  const updated = await updateProduct(product.id, updates);
  res.json({ product: updated });
});

export default router;
