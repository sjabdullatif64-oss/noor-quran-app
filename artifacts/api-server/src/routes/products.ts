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
  promotionType: z.enum(["none", "1day", "7day"]).default("none"),
  submittedBy:   z.string().max(100).optional(),
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
    userId:       user.id,
    title:        fields.title,
    description:  fields.description,
    imageUrl:     imageUrl || null,
    contactInfo:  fields.contactInfo,
    productLink:  productLink || null,
    category:     fields.category,
    status:       "pending",
    promotionType,
    coinsSpent:   coinsNeeded,
    submittedBy:  fields.submittedBy ?? null,
    approvedAt:   null,
    rejectedAt:   null,
    rejectionReason: null,
    promotionExpiry: null,
  });

  res.status(201).json({ product });
});

export default router;
