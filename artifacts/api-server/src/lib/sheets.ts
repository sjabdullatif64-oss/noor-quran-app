// Google Sheets data layer — replaces PostgreSQL/Drizzle
// Uses Replit Connectors SDK to proxy all requests through OAuth
import { ReplitConnectors } from "@replit/connectors-sdk";
import crypto from "node:crypto";

const connectors = new ReplitConnectors();
const SPREADSHEET_ID = "1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  deviceId: string;
  coinsBalance: number;
  totalCoinsEarned: number;
  totalReferrals: number;
  referredById: string | null;
  createdAt: string;
}

export interface CoinTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  eventKey: string | null;
  createdAt: string;
}

export interface AyahReward {
  id: string;
  userId: string;
  surahNumber: number;
  ayahNumber: number;
  date: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  createdAt: string;
}

export interface Product {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  contactInfo: string;
  productLink: string | null;
  category: string;
  status: "pending" | "approved" | "rejected";
  promotionType: "none" | "1day" | "7day";
  coinsSpent: number;
  submittedBy: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  promotionExpiry: string | null;
  createdAt: string;
}

export interface WelcomeCampaign {
  id: string;
  imageUrl: string | null;
  gifUrl: string | null;
  videoUrl: string | null;
  title: string;
  description: string;
  buttonText: string | null;
  url: string | null;
  durationSeconds: number;
  enabled: boolean;
}

export interface TeacherAccount {
  id: string;
  userId: string;
  recoveryKeyHash: string;
  recoveryKeyCiphertext: string;
  deviceIds: string[];
  accountJson: string;
  createdAt: string;
  updatedAt: string;
}

function isValidWelcomeCampaignUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return Boolean(parsed.hostname);
    }
    return ["mailto:", "tel:", "market:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ─── Sheet column definitions ─────────────────────────────────────────────────

const SHEETS = {
  Users:            ["id","deviceId","coinsBalance","totalCoinsEarned","totalReferrals","referredById","createdAt"],
  TeacherAccounts:  ["id","userId","recoveryKeyHash","recoveryKeyCiphertext","deviceIds","accountJson","createdAt","updatedAt"],
  CoinTransactions: ["id","userId","amount","reason","eventKey","createdAt"],
  DailyCheckins:    ["id","userId","date","createdAt"],
  AyahRewards:      ["id","userId","surahNumber","ayahNumber","date","createdAt"],
  Referrals:        ["id","referrerId","refereeId","createdAt"],
  Products:         ["id","userId","title","description","imageUrl","contactInfo","productLink","category","status","promotionType","coinsSpent","submittedBy","approvedAt","rejectedAt","rejectionReason","promotionExpiry","createdAt"],
  WelcomeCampaigns: ["id","imageUrl","gifUrl","videoUrl","title","description","buttonText","url","durationSeconds","enabled"],
} as const;

type SheetName = keyof typeof SHEETS;

// ─── Low-level HTTP helpers ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sheetsReq(method: string, path: string, body?: unknown): Promise<any> {
  const opts: { method: string; headers?: Record<string, string>; body?: string } = { method };
  if (body !== undefined) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const res = await connectors.proxy("google-sheet", path, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`Sheets ${method} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Column letter helper (A, B … Z, AA, AB …) ───────────────────────────────

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

// ─── Sheet initialization ─────────────────────────────────────────────────────

let _sheetIds: Record<string, number> = {};

export async function initSheets(): Promise<void> {
  const meta = await sheetsReq(
    "GET",
    `/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`,
  );

  const existing: Record<string, number> = {};
  for (const s of (meta?.sheets ?? []) as Array<{ properties: { title: string; sheetId: number } }>) {
    existing[s.properties.title] = s.properties.sheetId;
  }
  _sheetIds = existing;

  const toCreate = Object.keys(SHEETS).filter((name) => !(name in existing));
  if (toCreate.length > 0) {
    const result = await sheetsReq(
      "POST",
      `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      { requests: toCreate.map((title) => ({ addSheet: { properties: { title } } })) },
    );
    for (const reply of (result?.replies ?? []) as Array<{ addSheet?: { properties: { title: string; sheetId: number } } }>) {
      if (reply.addSheet) {
        _sheetIds[reply.addSheet.properties.title] = reply.addSheet.properties.sheetId;
      }
    }
  }

  for (const [sheetName, cols] of Object.entries(SHEETS)) {
    const check = await sheetsReq(
      "GET",
      `/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1:A1`,
    );
    const firstCell = (check?.values as string[][] | undefined)?.[0]?.[0];
    if (!firstCell || firstCell !== "id") {
      await sheetsReq(
        "PUT",
        `/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1?valueInputOption=RAW`,
        { range: `${sheetName}!A1`, majorDimension: "ROWS", values: [cols] },
      );
    }
  }
}

// ─── Generic read / write ─────────────────────────────────────────────────────

async function readAllRows(sheet: SheetName): Promise<Record<string, string>[]> {
  const cols = SHEETS[sheet] as readonly string[];
  const data = await sheetsReq(
    "GET",
    `/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheet}!A:${colLetter(cols.length)}`,
  );
  const rows = (data?.values as string[][] | undefined) ?? [];
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    cols.forEach((col, i) => { obj[col] = row[i] ?? ""; });
    return obj;
  });
}

async function appendRow(sheet: SheetName, values: string[]): Promise<void> {
  await sheetsReq(
    "POST",
    `/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheet}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { values: [values] },
  );
}

async function updateRowByDataIndex(sheet: SheetName, dataIdx: number, values: string[]): Promise<void> {
  const row = dataIdx + 2;
  const cols = SHEETS[sheet] as readonly string[];
  const range = `${sheet}!A${row}:${colLetter(cols.length)}${row}`;
  await sheetsReq(
    "PUT",
    `/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`,
    { range, majorDimension: "ROWS", values: [values] },
  );
}

async function deleteRowByDataIndex(sheet: SheetName, dataIdx: number): Promise<void> {
  const sheetId = _sheetIds[sheet];
  if (sheetId === undefined) throw new Error(`No sheetId cached for ${sheet} — call initSheets() first`);
  const startIndex = dataIdx + 1;
  await sheetsReq(
    "POST",
    `/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: "ROWS", startIndex, endIndex: startIndex + 1 },
        },
      }],
    },
  );
}

async function deleteRowsWhere(
  sheet: SheetName,
  predicate: (row: Record<string, string>) => boolean,
): Promise<void> {
  const rows = await readAllRows(sheet);
  // Delete from the bottom so each remaining data index stays valid.
  for (let index = rows.length - 1; index >= 0; index--) {
    if (predicate(rows[index])) await deleteRowByDataIndex(sheet, index);
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

function rowToUser(r: Record<string, string>): User {
  return {
    id:               r.id,
    deviceId:         r.deviceId,
    coinsBalance:     Number(r.coinsBalance) || 0,
    totalCoinsEarned: Number(r.totalCoinsEarned) || 0,
    totalReferrals:   Number(r.totalReferrals) || 0,
    referredById:     r.referredById || null,
    createdAt:        r.createdAt,
  };
}

function userToRow(u: User): string[] {
  return [u.id, u.deviceId, String(u.coinsBalance), String(u.totalCoinsEarned), String(u.totalReferrals), u.referredById ?? "", u.createdAt];
}

export async function findUserByDeviceId(deviceId: string): Promise<User | null> {
  const rows = await readAllRows("Users");
  const r = rows.find((x) => x.deviceId === deviceId);
  return r ? rowToUser(r) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = await readAllRows("Users");
  const r = rows.find((x) => x.id === id);
  return r ? rowToUser(r) : null;
}

export async function rebindUserDeviceId(id: string, deviceId: string): Promise<User> {
  const rows = await readAllRows("Users");
  const idx = rows.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error(`User ${id} not found`);
  const current = rowToUser(rows[idx]);
  const updated = { ...current, deviceId };
  await updateRowByDataIndex("Users", idx, userToRow(updated));
  return updated;
}

export async function createUser(data: Omit<User, "id" | "createdAt">): Promise<User> {
  const user: User = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
  await appendRow("Users", userToRow(user));
  return user;
}

export async function updateUser(id: string, updates: Partial<Omit<User, "id" | "deviceId" | "createdAt">>): Promise<User> {
  const rows = await readAllRows("Users");
  const idx = rows.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error(`User ${id} not found`);
  const updated: User = { ...rowToUser(rows[idx]), ...updates };
  await updateRowByDataIndex("Users", idx, userToRow(updated));
  return updated;
}

// ─── AI Teacher accounts ─────────────────────────────────────────────────────

const RECOVERY_KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function recoverySecret(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for Teacher Recovery Keys");
  return crypto.createHash("sha256").update(secret).digest();
}

function normalizeRecoveryKey(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function hashRecoveryKey(value: string): string {
  return crypto.createHmac("sha256", recoverySecret()).update(normalizeRecoveryKey(value)).digest("hex");
}

function encryptRecoveryKey(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", recoverySecret(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptRecoveryKey(value: string): string {
  const [ivText, tagText, dataText] = value.split(".");
  if (!ivText || !tagText || !dataText) throw new Error("Invalid encrypted Recovery Key");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    recoverySecret(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function encryptTeacherSnapshot(snapshot: Record<string, unknown>): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", recoverySecret(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(snapshot), "utf8"),
    cipher.final(),
  ]);
  return [
    "enc",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decryptTeacherSnapshot(value: string): Record<string, unknown> {
  if (!value.startsWith("enc.")) {
    try {
      const legacy = JSON.parse(value || "{}");
      return legacy && typeof legacy === "object" && !Array.isArray(legacy) ? legacy : {};
    } catch {
      return {};
    }
  }
  const [, ivText, tagText, dataText] = value.split(".");
  if (!ivText || !tagText || !dataText) return {};
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      recoverySecret(),
      Buffer.from(ivText, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plain);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function generateRecoveryKey(): string {
  const bytes = crypto.randomBytes(24);
  let body = "";
  for (const byte of bytes) body += RECOVERY_KEY_ALPHABET[byte % RECOVERY_KEY_ALPHABET.length];
  return `NQ-${body.slice(0, 8)}-${body.slice(8, 16)}-${body.slice(16, 24)}`;
}

function parseDeviceIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
  } catch {
    return [];
  }
}

function rowToTeacherAccount(r: Record<string, string>): TeacherAccount {
  return {
    id: r.id,
    userId: r.userId,
    recoveryKeyHash: r.recoveryKeyHash,
    recoveryKeyCiphertext: r.recoveryKeyCiphertext,
    deviceIds: parseDeviceIds(r.deviceIds),
    accountJson: r.accountJson || "{}",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function teacherAccountToRow(account: TeacherAccount): string[] {
  return [
    account.id,
    account.userId,
    account.recoveryKeyHash,
    account.recoveryKeyCiphertext,
    JSON.stringify(account.deviceIds),
    account.accountJson,
    account.createdAt,
    account.updatedAt,
  ];
}

export function teacherAccountClient(account: TeacherAccount): {
  id: string;
  userId: string;
  recoveryKey: string;
  account: Record<string, unknown>;
  updatedAt: string;
} {
  return {
    id: account.id,
    userId: account.userId,
    recoveryKey: decryptRecoveryKey(account.recoveryKeyCiphertext),
    account: decryptTeacherSnapshot(account.accountJson),
    updatedAt: account.updatedAt,
  };
}

export async function findTeacherAccountByUserId(userId: string): Promise<TeacherAccount | null> {
  const rows = await readAllRows("TeacherAccounts");
  const row = rows.find((item) => item.userId === userId);
  return row ? rowToTeacherAccount(row) : null;
}

export async function findTeacherAccountByRecoveryKey(value: string): Promise<TeacherAccount | null> {
  const hash = hashRecoveryKey(value);
  const rows = await readAllRows("TeacherAccounts");
  const row = rows.find((item) => item.recoveryKeyHash === hash);
  return row ? rowToTeacherAccount(row) : null;
}

export async function findTeacherAccountByDeviceId(deviceId: string): Promise<TeacherAccount | null> {
  if (!deviceId) return null;
  const rows = await readAllRows("TeacherAccounts");
  const row = rows.find((item) => parseDeviceIds(item.deviceIds).includes(deviceId));
  return row ? rowToTeacherAccount(row) : null;
}

export async function findTeacherAccountByRecoveryKeyAndDeviceId(
  recoveryKey: string,
  deviceId: string,
): Promise<TeacherAccount | null> {
  const account = await findTeacherAccountByRecoveryKey(recoveryKey);
  if (!account || !account.deviceIds.includes(deviceId)) return null;
  return account;
}

async function updateTeacherAccount(account: TeacherAccount): Promise<TeacherAccount> {
  const rows = await readAllRows("TeacherAccounts");
  const idx = rows.findIndex((item) => item.id === account.id);
  if (idx === -1) throw new Error(`Teacher account ${account.id} not found`);
  await updateRowByDataIndex("TeacherAccounts", idx, teacherAccountToRow(account));
  return account;
}

export async function deleteTeacherAccount(id: string): Promise<void> {
  const rows = await readAllRows("TeacherAccounts");
  const idx = rows.findIndex((item) => item.id === id);
  if (idx !== -1) await deleteRowByDataIndex("TeacherAccounts", idx);
}

/**
 * Permanently removes the account and all server-side records owned by it.
 * The Recovery Key is the only account credential available in this
 * device-identity-based app, so the caller must have already supplied it.
 */
export async function deleteUserAccountByRecoveryKey(recoveryKey: string): Promise<boolean> {
  const teacherAccount = await findTeacherAccountByRecoveryKey(recoveryKey);
  if (!teacherAccount) return false;

  const userId = teacherAccount.userId;
  await deleteRowsWhere("TeacherAccounts", (row) => row.userId === userId);
  await deleteRowsWhere("CoinTransactions", (row) => row.userId === userId);
  await deleteRowsWhere("DailyCheckins", (row) => row.userId === userId);
  await deleteRowsWhere("AyahRewards", (row) => row.userId === userId);
  await deleteRowsWhere(
    "Referrals",
    (row) => row.referrerId === userId || row.refereeId === userId,
  );
  await deleteRowsWhere("Products", (row) => row.userId === userId);
  await deleteRowsWhere("Users", (row) => row.id === userId);
  return true;
}

async function bindTeacherDevices(account: TeacherAccount, deviceIds: string[]): Promise<TeacherAccount> {
  const nextIds = [...new Set([...account.deviceIds, ...deviceIds].filter(Boolean))];
  if (nextIds.length === account.deviceIds.length && nextIds.every((id) => account.deviceIds.includes(id))) {
    return account;
  }
  return updateTeacherAccount({
    ...account,
    deviceIds: nextIds,
    updatedAt: new Date().toISOString(),
  });
}

let teacherAccountCreationQueue: Promise<unknown> = Promise.resolve();

async function createTeacherAccountOnce(
  userId: string,
  deviceIds: string[],
): Promise<TeacherAccount> {
  const task = teacherAccountCreationQueue.then(async () => {
    // Re-check inside the queue. A concurrent registration may have created
    // this user's account while the first read was still in flight.
    const existing = await findTeacherAccountByUserId(userId);
    if (existing) return bindTeacherDevices(existing, deviceIds);

    // The collision check is intentional: Recovery Keys are unique identities,
    // not merely random display strings.
    for (let attempt = 0; attempt < 5; attempt++) {
      const recoveryKey = generateRecoveryKey();
      if (await findTeacherAccountByRecoveryKey(recoveryKey)) continue;
      const now = new Date().toISOString();
      const account: TeacherAccount = {
        id: crypto.randomUUID(),
        userId,
        recoveryKeyHash: hashRecoveryKey(recoveryKey),
        recoveryKeyCiphertext: encryptRecoveryKey(recoveryKey),
        deviceIds: [...new Set(deviceIds.filter(Boolean))],
        accountJson: "{}",
        createdAt: now,
        updatedAt: now,
      };
      await appendRow("TeacherAccounts", teacherAccountToRow(account));
      return account;
    }
    throw new Error("Could not allocate a unique Teacher Recovery Key");
  });
  teacherAccountCreationQueue = task.catch(() => undefined);
  return task;
}

export async function getOrCreateTeacherAccount(
  userId: string,
  deviceIds: string[],
): Promise<TeacherAccount> {
  const existing = await findTeacherAccountByUserId(userId);
  if (existing) return bindTeacherDevices(existing, deviceIds);
  return createTeacherAccountOnce(userId, deviceIds);
}

export async function saveTeacherAccountSnapshot(
  account: TeacherAccount,
  snapshot: Record<string, unknown>,
): Promise<TeacherAccount> {
  return updateTeacherAccount({
    ...account,
    accountJson: encryptTeacherSnapshot(snapshot),
    updatedAt: new Date().toISOString(),
  });
}

export async function restoreTeacherAccountToDevice(
  recoveryKey: string,
  deviceId: string,
): Promise<TeacherAccount | null> {
  const account = await findTeacherAccountByRecoveryKey(recoveryKey);
  if (!account) return null;
  return bindTeacherDevices(account, [deviceId]);
}

// ─── CoinTransactions ─────────────────────────────────────────────────────────

function rowToTx(r: Record<string, string>): CoinTransaction {
  return { id: r.id, userId: r.userId, amount: Number(r.amount) || 0, reason: r.reason, eventKey: r.eventKey || null, createdAt: r.createdAt };
}

export async function addCoinTransaction(data: { userId: string; amount: number; reason: string; eventKey?: string | null }): Promise<void> {
  await appendRow("CoinTransactions", [crypto.randomUUID(), data.userId, String(data.amount), data.reason, data.eventKey ?? "", new Date().toISOString()]);
}

export async function getUserTransactions(userId: string, limit = 20): Promise<CoinTransaction[]> {
  const rows = await readAllRows("CoinTransactions");
  return rows.filter((r) => r.userId === userId).map(rowToTx).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export async function hasEventKey(userId: string, eventKey: string): Promise<boolean> {
  const rows = await readAllRows("CoinTransactions");
  return rows.some((r) => r.userId === userId && r.eventKey === eventKey);
}

// ─── Daily check-ins ──────────────────────────────────────────────────────────

export async function hasCheckedInToday(userId: string, date: string): Promise<boolean> {
  const rows = await readAllRows("DailyCheckins");
  return rows.some((r) => r.userId === userId && r.date === date);
}

export async function recordCheckin(userId: string, date: string): Promise<void> {
  await appendRow("DailyCheckins", [crypto.randomUUID(), userId, date, new Date().toISOString()]);
}

// ─── Ayah rewards ─────────────────────────────────────────────────────────────

export async function hasAyahReward(userId: string, surah: number, ayah: number): Promise<boolean> {
  const rows = await readAllRows("AyahRewards");
  return rows.some((r) => r.userId === userId && r.surahNumber === String(surah) && r.ayahNumber === String(ayah));
}

export async function countTodayAyahRewards(userId: string, date: string): Promise<number> {
  const rows = await readAllRows("AyahRewards");
  return rows.filter((r) => r.userId === userId && r.date === date).length;
}

export async function addAyahReward(userId: string, surah: number, ayah: number, date: string): Promise<void> {
  await appendRow("AyahRewards", [crypto.randomUUID(), userId, String(surah), String(ayah), date, new Date().toISOString()]);
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export async function hasReferral(refereeId: string): Promise<boolean> {
  const rows = await readAllRows("Referrals");
  return rows.some((r) => r.refereeId === refereeId);
}

export async function addReferral(referrerId: string, refereeId: string): Promise<void> {
  await appendRow("Referrals", [crypto.randomUUID(), referrerId, refereeId, new Date().toISOString()]);
}

// ─── Products ─────────────────────────────────────────────────────────────────

function rowToProduct(r: Record<string, string>): Product {
  return {
    id:               r.id,
    userId:           r.userId,
    title:            r.title,
    description:      r.description,
    imageUrl:         r.imageUrl || null,
    contactInfo:      r.contactInfo,
    productLink:      r.productLink || null,
    category:         r.category,
    status:           (r.status as Product["status"]) || "pending",
    promotionType:    (r.promotionType as Product["promotionType"]) || "none",
    coinsSpent:       Number(r.coinsSpent) || 0,
    submittedBy:      r.submittedBy || null,
    approvedAt:       r.approvedAt || null,
    rejectedAt:       r.rejectedAt || null,
    rejectionReason:  r.rejectionReason || null,
    promotionExpiry:  r.promotionExpiry || null,
    createdAt:        r.createdAt,
  };
}

function productToRow(p: Product): string[] {
  return [p.id, p.userId, p.title, p.description, p.imageUrl ?? "", p.contactInfo, p.productLink ?? "", p.category, p.status, p.promotionType, String(p.coinsSpent), p.submittedBy ?? "", p.approvedAt ?? "", p.rejectedAt ?? "", p.rejectionReason ?? "", p.promotionExpiry ?? "", p.createdAt];
}

export async function getApprovedProducts(): Promise<Product[]> {
  const now = new Date().toISOString();
  const rows = await readAllRows("Products");
  return rows
    .map(rowToProduct)
    .filter((p) =>
      p.status === "approved" &&
      // Exclude featured listings — those are served by getFeaturedProducts only
      p.promotionType !== "7day" &&
      // Exclude expired listings; legacy null-expiry products (promotionType "none") remain visible
      (!p.promotionExpiry || p.promotionExpiry > now),
    )
    .sort((a, b) => (b.approvedAt ?? b.createdAt).localeCompare(a.approvedAt ?? a.createdAt));
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const now = new Date().toISOString();
  const rows = await readAllRows("Products");
  return rows
    .map(rowToProduct)
    .filter((p) =>
      p.status === "approved" &&
      p.promotionType === "7day" &&
      !!p.promotionExpiry &&
      p.promotionExpiry > now,
    )
    .sort((a, b) => (b.promotionExpiry ?? "").localeCompare(a.promotionExpiry ?? ""));
}

export async function getPendingProducts(): Promise<Product[]> {
  const rows = await readAllRows("Products");
  return rows.map(rowToProduct).filter((p) => p.status === "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllProductsAdmin(): Promise<Product[]> {
  const rows = await readAllRows("Products");
  return rows.map(rowToProduct).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUserProducts(userId: string): Promise<Product[]> {
  const rows = await readAllRows("Products");
  return rows.map(rowToProduct).filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProductById(id: string): Promise<Product | null> {
  const rows = await readAllRows("Products");
  const r = rows.find((x) => x.id === id);
  return r ? rowToProduct(r) : null;
}

export async function createProduct(data: Omit<Product, "id" | "createdAt">): Promise<Product> {
  const product: Product = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
  await appendRow("Products", productToRow(product));
  return product;
}

export async function updateProduct(id: string, updates: Partial<Omit<Product, "id" | "createdAt">>): Promise<Product> {
  const rows = await readAllRows("Products");
  const idx = rows.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error(`Product ${id} not found`);
  const updated: Product = { ...rowToProduct(rows[idx]), ...updates };
  await updateRowByDataIndex("Products", idx, productToRow(updated));
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  const rows = await readAllRows("Products");
  const idx = rows.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error(`Product ${id} not found`);
  await deleteRowByDataIndex("Products", idx);
}

// ─── Welcome campaigns ────────────────────────────────────────────────────────

function parseEnabled(value: string): boolean {
  return ["true", "1", "yes", "y", "enabled", "active", "on"].includes(value.trim().toLowerCase());
}

function rowToWelcomeCampaign(r: Record<string, string>): WelcomeCampaign {
  const duration = Number(r.durationSeconds);
  return {
    id: r.id.trim(),
    imageUrl: r.imageUrl.trim() || null,
    gifUrl: r.gifUrl.trim() || null,
    videoUrl: r.videoUrl.trim() || null,
    title: r.title.trim(),
    description: r.description.trim(),
    buttonText: r.buttonText.trim() || null,
    url: isValidWelcomeCampaignUrl(r.url) ? r.url.trim() : null,
    durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 6,
    enabled: parseEnabled(r.enabled),
  };
}

export async function getActiveWelcomeCampaigns(): Promise<WelcomeCampaign[]> {
  const rows = await readAllRows("WelcomeCampaigns");
  return rows
    .map(rowToWelcomeCampaign)
    .filter((campaign) => campaign.enabled && campaign.id && campaign.title)
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ─── Helper: add coins + record transaction ───────────────────────────────────

export async function addCoins(userId: string, amount: number, reason: string, eventKey?: string | null): Promise<number> {
  const user = await findUserById(userId);
  if (!user) throw new Error(`User ${userId} not found`);
  const newBalance = Math.max(0, user.coinsBalance + amount);
  const newEarned = amount > 0 ? user.totalCoinsEarned + amount : user.totalCoinsEarned;
  await updateUser(userId, { coinsBalance: newBalance, totalCoinsEarned: newEarned });
  await addCoinTransaction({ userId, amount, reason, eventKey });
  return newBalance;
}
