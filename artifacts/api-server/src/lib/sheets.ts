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

// ─── Sheet column definitions ─────────────────────────────────────────────────

const SHEETS = {
  Users:            ["id","deviceId","coinsBalance","totalCoinsEarned","totalReferrals","referredById","createdAt"],
  CoinTransactions: ["id","userId","amount","reason","eventKey","createdAt"],
  DailyCheckins:    ["id","userId","date","createdAt"],
  AyahRewards:      ["id","userId","surahNumber","ayahNumber","date","createdAt"],
  Referrals:        ["id","referrerId","refereeId","createdAt"],
  Products:         ["id","userId","title","description","imageUrl","contactInfo","productLink","category","status","promotionType","coinsSpent","submittedBy","approvedAt","rejectedAt","rejectionReason","promotionExpiry","createdAt"],
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
    .filter(
      (p) =>
        p.status === "approved" &&
        // hide expired promoted listings; legacy null-expiry products remain visible
        (!p.promotionExpiry || p.promotionExpiry > now),
    )
    .sort((a, b) => {
      // Active featured products always first, then newest approved
      const aFeatured = a.promotionType !== "none" && !!a.promotionExpiry && a.promotionExpiry > now;
      const bFeatured = b.promotionType !== "none" && !!b.promotionExpiry && b.promotionExpiry > now;
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      return (b.approvedAt ?? b.createdAt).localeCompare(a.approvedAt ?? a.createdAt);
    });
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const now = new Date().toISOString();
  const rows = await readAllRows("Products");
  return rows.map(rowToProduct).filter((p) => p.status === "approved" && p.promotionType !== "none" && !!p.promotionExpiry && p.promotionExpiry > now).sort((a, b) => (b.promotionExpiry ?? "").localeCompare(a.promotionExpiry ?? ""));
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
