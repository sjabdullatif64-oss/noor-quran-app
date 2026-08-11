import { Router, type Request } from "express";
import { z } from "zod";
import {
  findUserByDeviceId,
  findUserById,
  createUser,
  updateUser,
  getUserTransactions,
  getUserProducts,
  getOrCreateTeacherAccount,
  findTeacherAccountByDeviceId,
  findTeacherAccountByRecoveryKeyAndDeviceId,
  findTeacherAccountByUserId,
  saveTeacherAccountSnapshot,
  restoreTeacherAccountToDevice,
  teacherAccountClient,
  rebindUserDeviceId,
  deleteTeacherAccount,
  touchUserActivity,
} from "../lib/sheets";

const router = Router();

const registerSchema = z.object({
  deviceId:     z.string().min(1).max(200),
  persistentDeviceId: z.string().min(1).max(300).optional(),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/).optional(),
});

function requestCountryCode(req: Request, fallback?: string): string {
  const candidate =
    req.header("x-replit-user-country")
    ?? req.header("x-country-code")
    ?? req.header("cf-ipcountry")
    ?? req.header("x-vercel-ip-country")
    ?? fallback
    ?? "ZZ";
  return /^[A-Za-z]{2}$/.test(candidate) ? candidate.toUpperCase() : "ZZ";
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  const { deviceId, persistentDeviceId } = parsed.data;
  const seenAt = new Date().toISOString();
  const detectedCountry = requestCountryCode(req);

  let existing = await findUserByDeviceId(deviceId);
  if (!existing && persistentDeviceId) {
    const recoveredTeacher = await findTeacherAccountByDeviceId(persistentDeviceId);
    if (recoveredTeacher) {
      existing = await findUserById(recoveredTeacher.userId);
      if (existing && existing.deviceId !== deviceId) {
        existing = await rebindUserDeviceId(existing.id, deviceId);
      }
    }
  }
  if (existing) {
    await touchUserActivity(deviceId, detectedCountry, seenAt);
    const teacherAccount = await getOrCreateTeacherAccount(
      existing.id,
      [deviceId, ...(persistentDeviceId ? [persistentDeviceId] : [])],
    );
    res.json({ user: existing, isNew: false, teacherAccount: teacherAccountClient(teacherAccount) });
    return;
  }

  const newUser = await createUser({
    deviceId,
    coinsBalance:     0,
    totalCoinsEarned: 0,
    countryCode: detectedCountry,
    lastSeenAt: seenAt,
  });

  const fresh = await findUserById(newUser.id);
  const teacherAccount = await getOrCreateTeacherAccount(
    (fresh ?? newUser).id,
    [deviceId, ...(persistentDeviceId ? [persistentDeviceId] : [])],
  );
  res.status(201).json({
    user: fresh ?? newUser,
    isNew: true,
    teacherAccount: teacherAccountClient(teacherAccount),
  });
});

const presenceSchema = z.object({
  deviceId: z.string().min(1).max(200),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/).optional(),
});

router.post("/presence", async (req, res) => {
  const parsed = presenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid presence request" });
    return;
  }
  const updated = await touchUserActivity(
    parsed.data.deviceId,
    requestCountryCode(req),
  );
  if (!updated) {
    res.status(404).json({ error: "User not found — register first" });
    return;
  }
  res.status(204).end();
});

const teacherSnapshotSchema = z.object({
  deviceId: z.string().min(1).max(300),
  recoveryKey: z.string().min(10).max(100),
  storage: z.record(z.string()).default({}),
  progress: z.record(z.unknown()).nullable(),
  practice: z.record(z.unknown()).nullable(),
});

router.post("/teacher-account", async (req, res) => {
  const parsed = teacherSnapshotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid Teacher account snapshot" });
    return;
  }
  const { deviceId, recoveryKey, storage, progress, practice } = parsed.data;
  const account = await findTeacherAccountByRecoveryKeyAndDeviceId(recoveryKey, deviceId);
  if (!account) {
    res.status(404).json({ error: "Teacher account not found" });
    return;
  }
  const updated = await saveTeacherAccountSnapshot(account, { storage, progress, practice });
  res.json({ teacherAccount: teacherAccountClient(updated) });
});

const restoreTeacherSchema = z.object({
  deviceId: z.string().min(1).max(300),
  recoveryKey: z.string().min(10).max(100),
});

router.post("/restore-teacher", async (req, res) => {
  const parsed = restoreTeacherSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid Recovery Key" });
    return;
  }
  const account = await restoreTeacherAccountToDevice(
    parsed.data.recoveryKey,
    parsed.data.deviceId,
  );
  if (!account) {
    res.status(404).json({ error: "Invalid Recovery Key" });
    return;
  }
  const currentUser = await findUserByDeviceId(parsed.data.deviceId);
  if (currentUser && currentUser.id !== account.userId) {
    const currentTeacherAccount = await findTeacherAccountByUserId(currentUser.id);
    if (currentTeacherAccount && currentTeacherAccount.id !== account.id) {
      await deleteTeacherAccount(currentTeacherAccount.id);
    }
    await rebindUserDeviceId(currentUser.id, `replaced-${currentUser.id}`);
  }
  const originalUser = await findUserById(account.userId);
  if (originalUser && originalUser.deviceId !== parsed.data.deviceId) {
    await rebindUserDeviceId(originalUser.id, parsed.data.deviceId);
  }
  res.json({ teacherAccount: teacherAccountClient(account) });
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
