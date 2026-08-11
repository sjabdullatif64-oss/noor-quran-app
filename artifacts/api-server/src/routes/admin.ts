import { Router } from "express";
import { z } from "zod";
import { createAdminSession, isValidAdminToken, requireAdminSession } from "../middlewares/adminSessionGuard";
import {
  createProduct,
  createWelcomeCampaign,
  deleteProduct,
  deleteWelcomeCampaign,
  getAllProducts,
  getAllWelcomeCampaigns,
  getTeacherAccountSnapshots,
  updateProduct,
  updateWelcomeCampaign,
  type Product,
  type WelcomeCampaign,
} from "../lib/sheets";

const router = Router();
const admin = requireAdminSession();

const campaignFields = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  imageUrl: z.string().max(2_000_000).nullable().optional(),
  gifUrl: z.string().max(2_000_000).nullable().optional(),
  videoUrl: z.string().max(2_000_000).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).default(""),
  buttonText: z.string().trim().max(120).nullable().optional(),
  url: z.string().trim().max(2_000).nullable().optional(),
  durationSeconds: z.coerce.number().int().min(1).max(120).default(6),
  enabled: z.boolean().default(false),
});

const productFields = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2_000).default(""),
  imageUrl: z.string().max(2_000_000).nullable().optional(),
  contactInfo: z.string().trim().max(500).default(""),
  productLink: z.string().trim().max(2_000).nullable().optional(),
  category: z.enum(["tasbeeh", "prayer_mat", "books", "attar", "courses", "other"]).default("other"),
  status: z.enum(["pending", "approved", "rejected"]).default("approved"),
  displayOrder: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

function cleanNullable(value: string | null | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

function campaignUpdates(input: Partial<z.infer<typeof campaignFields>>): Partial<Omit<WelcomeCampaign, "id">> {
  const updates: Partial<Omit<WelcomeCampaign, "id">> = {};
  if (input.imageUrl !== undefined) updates.imageUrl = cleanNullable(input.imageUrl);
  if (input.gifUrl !== undefined) updates.gifUrl = cleanNullable(input.gifUrl);
  if (input.videoUrl !== undefined) updates.videoUrl = cleanNullable(input.videoUrl);
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.buttonText !== undefined) updates.buttonText = cleanNullable(input.buttonText);
  if (input.url !== undefined) updates.url = cleanNullable(input.url);
  if (input.durationSeconds !== undefined) updates.durationSeconds = input.durationSeconds;
  if (input.enabled !== undefined) updates.enabled = input.enabled;
  return updates;
}

function productUpdates(input: Partial<z.infer<typeof productFields>>): Partial<Omit<Product, "id" | "createdAt">> {
  const updates: Partial<Omit<Product, "id" | "createdAt">> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.imageUrl !== undefined) updates.imageUrl = cleanNullable(input.imageUrl);
  if (input.contactInfo !== undefined) updates.contactInfo = input.contactInfo;
  if (input.productLink !== undefined) updates.productLink = cleanNullable(input.productLink);
  if (input.category !== undefined) updates.category = input.category;
  if (input.status !== undefined) updates.status = input.status;
  if (input.displayOrder !== undefined) updates.displayOrder = input.displayOrder;
  return updates;
}

router.post("/session", (req, res) => {
  if (!isValidAdminToken(req.body?.token)) {
    res.status(401).json({ error: "Invalid admin credentials" });
    return;
  }
  res.json({ session: createAdminSession() });
});

router.get("/teacher-analytics", admin, async (_req, res) => {
  const accounts = (await getTeacherAccountSnapshots()).filter((account) => {
    const progress = account.snapshot.progress;
    return Boolean(progress && typeof progress === "object" && !Array.isArray(progress));
  });
  const levelTotals = [28, 5, 8, 29, 8026];
  const levelNames = [
    "Arabic Letters",
    "Harakat (Vowel Marks)",
    "Small Words",
    "Surah Al-Fatihah",
    "Full Quran Reading",
  ];
  const levels = levelTotals.map((total, index) => ({
    level: index + 1,
    title: levelNames[index],
    totalLessons: total,
    completedLessons: 0,
    users: 0,
  }));
  const lessonInventory = new Map<string, { level: number; order: number; completedBy: number }>();
  for (let level = 1; level <= 5; level++) {
    for (let order = 1; order <= levelTotals[level - 1]; order++) {
      const id = level === 5
        ? `quran-${String(order).padStart(4, "0")}`
        : `l${level}-${String(order).padStart(2, "0")}`;
      lessonInventory.set(id, { level, order, completedBy: 0 });
    }
  }
  const users = accounts.map((account, index) => {
    const progress = account.snapshot.progress;
    const completed =
      progress && typeof progress === "object" && !Array.isArray(progress)
        && (progress as Record<string, unknown>).completed
        && typeof (progress as Record<string, unknown>).completed === "object"
        ? (progress as Record<string, unknown>).completed as Record<string, unknown>
        : {};
    const completedIds = Object.keys(completed);
    const completedByLevel = levels.map((level, levelIndex) => {
      const prefix = `l${level.level}-`;
      const count = level.level === 5
        ? completedIds.filter((id) => id.startsWith("quran-")).length
        : completedIds.filter((id) => id.startsWith(prefix)).length;
      level.completedLessons += Math.min(count, levelTotals[levelIndex]);
      return count;
    });
    completedIds.forEach((id) => {
      const match = id.match(/^l([1-4])-(\d+)$/) ?? id.match(/^quran-(\d+)$/);
      if (!match) return;
      const level = id.startsWith("quran-") ? 5 : Number(match[1]);
      const order = id.startsWith("quran-") ? Number(match[1]) : Number(match[2]);
      const current = lessonInventory.get(id);
      if (current) current.completedBy += 1;
    });
    let currentLevel = 5;
    for (let level = 0; level < levelTotals.length; level++) {
      if (completedByLevel[level] < levelTotals[level]) {
        currentLevel = level + 1;
        break;
      }
    }
    const completedLessons = Math.min(completedIds.length, levelTotals.reduce((a, b) => a + b, 0));
    const checked = completedIds
      .map((id) => completed[id])
      .filter((record): record is Record<string, unknown> =>
        Boolean(record && typeof record === "object" && !Array.isArray(record)
          && !(record as Record<string, unknown>).selfAssessed),
      );
    const avgAccuracy = checked.length
      ? Math.round(checked.reduce((sum, record) => sum + Math.max(0, Math.min(100, Number(record.accuracy) || 0)), 0) / checked.length)
      : 0;
    const retries = progress && typeof progress === "object"
      ? Number((progress as Record<string, unknown>).totalRetries) || 0
      : 0;
    const timeSpentMs = progress && typeof progress === "object"
      ? Number((progress as Record<string, unknown>).timeSpentMs) || 0
      : 0;
    return {
      learner: `Learner ${String(index + 1).padStart(3, "0")}`,
      currentLevel,
      completedLessons,
      progressPercent: Math.round((completedLessons / levelTotals.reduce((a, b) => a + b, 0)) * 100),
      avgAccuracy,
      totalRetries: retries,
      timeSpentMs,
      lastSyncedAt: account.updatedAt,
    };
  });
  levels.forEach((level) => {
    level.users = users.filter((user) => user.currentLevel === level.level).length;
  });
  res.json({
    totalUsers: accounts.length,
    totalLessons: levelTotals.reduce((a, b) => a + b, 0),
    overallCompletedLessons: users.reduce((sum, user) => sum + user.completedLessons, 0),
    overallProgressPercent: users.length
      ? Math.round(users.reduce((sum, user) => sum + user.progressPercent, 0) / users.length)
      : 0,
    averageAccuracy: users.length
      ? Math.round(users.reduce((sum, user) => sum + user.avgAccuracy, 0) / users.length)
      : 0,
    totalRetries: users.reduce((sum, user) => sum + user.totalRetries, 0),
    totalTimeSpentMs: users.reduce((sum, user) => sum + user.timeSpentMs, 0),
    levels,
    lessons: [...lessonInventory.entries()]
      .map(([id, lesson]) => ({ ...lesson, id }))
      .sort((a, b) => a.level - b.level || a.order - b.order),
    users,
  });
});

router.get("/campaigns", admin, async (_req, res) => {
  res.json({ campaigns: await getAllWelcomeCampaigns() });
});

router.post("/campaigns", admin, async (req, res) => {
  const parsed = campaignFields.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid campaign", details: parsed.error.issues });
    return;
  }
  const { id, ...fields } = parsed.data;
  const normalized = campaignUpdates(fields);
  const campaign = await createWelcomeCampaign({
    ...(id ? { id } : {}),
    imageUrl: normalized.imageUrl ?? null,
    gifUrl: normalized.gifUrl ?? null,
    videoUrl: normalized.videoUrl ?? null,
    title: normalized.title ?? "",
    description: normalized.description ?? "",
    buttonText: normalized.buttonText ?? null,
    url: normalized.url ?? null,
    durationSeconds: normalized.durationSeconds ?? 6,
    enabled: normalized.enabled ?? false,
  });
  res.status(201).json({ campaign });
});

router.patch("/campaigns/:id", admin, async (req, res) => {
  const parsed = campaignFields.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid campaign", details: parsed.error.issues });
    return;
  }
  const campaignId = String(req.params.id);
  const campaign = await updateWelcomeCampaign(campaignId, campaignUpdates(parsed.data));
  res.json({ campaign });
});

router.delete("/campaigns/:id", admin, async (req, res) => {
  await deleteWelcomeCampaign(String(req.params.id));
  res.status(204).end();
});

router.get("/products", admin, async (_req, res) => {
  res.json({ products: await getAllProducts() });
});

router.post("/products", admin, async (req, res) => {
  const parsed = productFields.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product", details: parsed.error.issues });
    return;
  }
  const fields = productUpdates(parsed.data) as Required<Pick<Product, "title" | "description" | "imageUrl" | "contactInfo" | "productLink" | "category" | "status" | "displayOrder">>;
  const product = await createProduct({
    userId: "admin",
    ...fields,
    contactInfo: fields.contactInfo ?? "",
    status: fields.status ?? "approved",
    promotionType: "none",
    coinsSpent: 0,
    submittedBy: "admin",
    approvedAt: fields.status === "approved" ? new Date().toISOString() : null,
    rejectedAt: fields.status === "rejected" ? new Date().toISOString() : null,
    rejectionReason: null,
    promotionExpiry: null,
  });
  res.status(201).json({ product });
});

router.patch("/products/:id", admin, async (req, res) => {
  const parsed = productFields.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product", details: parsed.error.issues });
    return;
  }
  const updates = productUpdates(parsed.data);
  if (updates.status === "approved") {
    updates.approvedAt = new Date().toISOString();
    updates.rejectedAt = null;
  }
  if (updates.status === "rejected") {
    updates.rejectedAt = new Date().toISOString();
    updates.approvedAt = null;
  }
  const product = await updateProduct(String(req.params.id), updates);
  res.json({ product });
});

router.delete("/products/:id", admin, async (req, res) => {
  await deleteProduct(String(req.params.id));
  res.status(204).end();
});

export default router;