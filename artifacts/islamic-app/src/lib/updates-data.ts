// ── Types ─────────────────────────────────────────────────────────────────────
export interface UpdateItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url: string;
  button_text: string;
  target_link: string;
  category: string;
  status: string;
  created_at: string;
}

export interface LocalAdminItem extends UpdateItem {
  _local: true;
  _ts: number;
}

export interface OverrideEntry {
  id: string;
  data: Partial<UpdateItem>;
}

// ── Sheet config ───────────────────────────────────────────────────────────────
const SHEET_ID = "1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw";
export const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

// ── Apps Script URL (pre-configured — no setup needed) ────────────────────────
// This is the deployed Web App URL. Users can override it in Admin Panel.
const DEFAULT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxjvXgRELy33GhaK8q8KFjaayPKLsJX4wjYPIiNTU6236mCUcA_mgl_prI_KQaZWCjA/exec";

// ── localStorage keys ─────────────────────────────────────────────────────────
const KEY_LOCAL      = "noor-adm-local";
const KEY_DELETED    = "noor-adm-deleted";
const KEY_OVERRIDES  = "noor-adm-overrides";
const KEY_SCRIPT_URL = "noor-adm-script-url";

// ── Google Drive URL resolver ─────────────────────────────────────────────────
// Converts any Google Drive share/view URL into a displayable image URL.
// NOTE: The Drive file MUST be shared as "Anyone with the link can view".
export function resolveImageUrl(url: string): string {
  if (!url) return url;

  let fileId: string | null = null;

  // https://drive.google.com/file/d/{ID}/view
  const m1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) fileId = m1[1];

  // https://drive.google.com/open?id={ID}
  if (!fileId) {
    const m2 = url.match(/drive\.google\.com\/open\?.*?id=([a-zA-Z0-9_-]+)/);
    if (m2) fileId = m2[1];
  }

  // https://drive.google.com/uc?id={ID}  or  uc?export=view&id={ID}
  if (!fileId && url.includes("drive.google.com/uc")) {
    const m3 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m3) fileId = m3[1];
  }

  // https://drive.google.com/thumbnail?id={ID}
  if (!fileId && url.includes("drive.google.com/thumbnail")) {
    const m4 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m4) fileId = m4[1];
  }

  // https://lh3.googleusercontent.com/d/{ID}  (already resolved)
  if (!fileId && url.includes("lh3.googleusercontent.com/d/")) {
    const m5 = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (m5) fileId = m5[1];
  }

  if (fileId) {
    const resolved = `https://lh3.googleusercontent.com/d/${fileId}`;
    console.log(`[Noor/Image] original="${url}" → fileId="${fileId}" → resolved="${resolved}"`);
    return resolved;
  }

  // Not a Drive URL — use as-is (direct image URLs, CDN, etc.)
  return url;
}

// ── GViz parser ───────────────────────────────────────────────────────────────
export function parseGViz(text: string): UpdateItem[] {
  try {
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
    if (!match) return [];
    const data = JSON.parse(match[1]) as {
      status: string;
      table: {
        cols: Array<{ id: string; label: string; type: string }>;
        rows: Array<{ c: Array<{ v: string | number | null } | null> }>;
      };
    };
    if (data.status !== "ok") return [];
    const cols = data.table.cols ?? [];
    const rows = data.table.rows ?? [];
    if (!cols.length || !rows.length) return [];
    const headers = cols.map((col) => col.label?.toString().trim() ?? "");
    const items: UpdateItem[] = [];
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        const cell = row.c?.[idx];
        const val  = cell?.v;
        obj[h] = val != null ? val.toString().trim() : "";
      });
      if (obj.title && obj.status?.toLowerCase() === "active") {
        if (!obj.id) obj.id = `sheet-row-${rowIdx}`;
        console.log(`[Noor/Sheet] row ${rowIdx} — id="${obj.id}" title="${obj.title}" image_url="${obj.image_url}"`);
        items.push(obj as unknown as UpdateItem);
      }
    }
    console.log(`[Noor/Sheet] parseGViz → ${items.length} active items`);
    return items;
  } catch (err) {
    console.error("[Noor/Sheet] parseGViz error:", err);
    return [];
  }
}

// ── Read via GViz (public, used for initial load) ─────────────────────────────
export async function fetchUpdates(): Promise<UpdateItem[]> {
  console.log("[Noor/Sheet] fetchUpdates (GViz)");
  const res = await fetch(SHEET_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Sheet fetch failed: HTTP ${res.status}`);
  return parseGViz(await res.text());
}

// ── Admin localStorage helpers ─────────────────────────────────────────────────
function safeParse<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; }
  catch { return fallback; }
}

export const adminData = {
  loadLocal:     (): LocalAdminItem[]  => safeParse(KEY_LOCAL,     []),
  saveLocal:     (v: LocalAdminItem[]) => localStorage.setItem(KEY_LOCAL,     JSON.stringify(v)),
  loadDeleted:   (): string[]          => safeParse(KEY_DELETED,   []),
  saveDeleted:   (v: string[])         => localStorage.setItem(KEY_DELETED,   JSON.stringify(v)),
  loadOverrides: (): OverrideEntry[]   => safeParse(KEY_OVERRIDES, []),
  saveOverrides: (v: OverrideEntry[])  => localStorage.setItem(KEY_OVERRIDES, JSON.stringify(v)),
  // Falls back to DEFAULT_SCRIPT_URL if user hasn't saved a custom URL
  loadScriptUrl: (): string => localStorage.getItem(KEY_SCRIPT_URL) || DEFAULT_SCRIPT_URL,
  saveScriptUrl: (v: string) => {
    if (v.trim()) localStorage.setItem(KEY_SCRIPT_URL, v.trim());
  },
};

export function generateId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Merge sheet items with local admin items, applying deletions + overrides.
// Local items take priority: if a local item has the same ID OR the same
// normalised title as a Sheet item, the Sheet item is excluded — this prevents
// a locally-created item from appearing twice after it has been synced to the
// Google Sheet and received a new Sheet-assigned ID.
export function mergeItems(
  sheetItems: UpdateItem[],
  localItems: LocalAdminItem[],
  deletedIds: string[],
  overrides:  OverrideEntry[],
): UpdateItem[] {
  const dead     = new Set(deletedIds);
  const ovrMap   = new Map(overrides.map((o) => [o.id, o.data]));

  const liveLocals = localItems.filter((it) => !dead.has(it.id));

  // IDs already covered by local items — exclude matching Sheet rows
  const localIds = new Set(liveLocals.map((it) => it.id));

  // Normalised titles of local items — catches post-sync duplicates where the
  // Sheet assigns a new row-ID to an item that already exists locally.
  const localTitles = new Set(
    liveLocals
      .map((it) => it.title?.trim().toLowerCase())
      .filter(Boolean)
  );

  const filtered = sheetItems
    .filter((it) =>
      !dead.has(it.id) &&
      !localIds.has(it.id) &&
      !localTitles.has(it.title?.trim().toLowerCase())
    )
    .map((it) => { const o = ovrMap.get(it.id); return o ? { ...it, ...o } : it; });

  return [...liveLocals, ...filtered];
}

// ── Google Apps Script sync (write) ───────────────────────────────────────────
// Uses mode:"no-cors" so the POST always reaches Apps Script regardless of
// CORS headers or Google's 302 redirect. Response is opaque (unreadable) but
// the script runs and writes to the Sheet.
export interface ScriptSyncResult {
  ok: boolean;
  error?: string;
}

export async function scriptSync(
  action: "create" | "edit" | "delete",
  payload: { item?: Partial<UpdateItem>; id?: string },
): Promise<ScriptSyncResult> {
  const url = adminData.loadScriptUrl();
  if (!url) return { ok: false, error: "No Apps Script URL configured." };

  const body = JSON.stringify({ action, ...payload });
  console.log(`[Noor/Sync] ▶ action="${action}" url="${url.slice(0, 60)}…"`);
  console.log(`[Noor/Sync]   body=`, body);

  try {
    // no-cors bypasses CORS preflight and redirect CORS checks entirely.
    // The browser sends the request; Google Apps Script receives and processes it.
    // We cannot read the response (it's opaque) but the write always goes through.
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      body,
    });
    console.log("[Noor/Sync] ✓ Request sent (no-cors, opaque response — write went through)");
    return { ok: true };
  } catch (e) {
    // A catch here means a real network error (offline, DNS failure, etc.)
    const msg = (e as Error).message;
    console.error("[Noor/Sync] ✗ Network error:", msg);
    return { ok: false, error: `Network error: ${msg}` };
  }
}

// ── Corrected Apps Script code (uses openById — works as standalone script) ───
// Copy this entire block into script.google.com, then redeploy as a new version.
export const APPS_SCRIPT_TEMPLATE = `/**
 * Noor Quran — Google Apps Script Web App  (v2 — openById fix)
 * =============================================================
 * IMPORTANT: Uses SpreadsheetApp.openById() instead of getActiveSpreadsheet()
 * so this works as a STANDALONE project (not bound to a spreadsheet).
 *
 * Sheet ID : 1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw
 * Columns  : A=id  B=title  C=description  D=image_url  E=video_url
 *            F=button_text  G=target_link  H=category  I=status  J=created_at
 *
 * Quick test after deploy:
 *   Open the Web App URL in your browser — you should see JSON like:
 *   {"ok":true,"message":"Noor Quran Sheet API is live.","data_rows":1,...}
 *
 * Redeploy steps:
 *   1. Paste this code (delete old code first)
 *   2. Save (Ctrl+S)
 *   3. Deploy → Manage deployments → pencil icon → New version → Deploy
 */

var SHEET_ID = "1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw";
var SHEET_NAME = "Sheet1";
var CANONICAL_HEADERS = [
  "id","title","description","image_url","video_url",
  "button_text","target_link","category","status","created_at"
];

function doGet(e) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    return buildResponse({
      ok: true, message: "Noor Quran Sheet API is live.",
      sheet_name: sheet.getName(),
      data_rows: Math.max(0, sheet.getLastRow() - 1)
    });
  } catch(err) {
    return buildResponse({ ok: false, error: "doGet error: " + err.message });
  }
}

function doPost(e) {
  var raw = "";
  try { raw = e && e.postData ? e.postData.contents : ""; } catch(_) {}
  Logger.log("doPost body: " + raw);

  if (!raw || raw.trim() === "") {
    return buildResponse({ ok: false, error: "Empty request body." });
  }
  var data;
  try { data = JSON.parse(raw); }
  catch(pe) { return buildResponse({ ok: false, error: "Invalid JSON: " + pe.message }); }

  var action = String(data.action || "").toLowerCase();
  Logger.log("action=" + action);

  var ss, sheet;
  try {
    ss    = SpreadsheetApp.openById(SHEET_ID);
    sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    Logger.log("Sheet: " + sheet.getName() + " rows=" + sheet.getLastRow());
  } catch(se) {
    return buildResponse({ ok: false, error: "Cannot open sheet: " + se.message });
  }

  try {
    if      (action === "read")   return handleRead(sheet);
    else if (action === "create") return handleCreate(sheet, data.item);
    else if (action === "edit")   return handleEdit(sheet, String(data.id||""), data.item);
    else if (action === "delete") return handleDelete(sheet, String(data.id||""));
    else if (action === "test")   return buildResponse({
      ok: true, message: "Test OK — Apps Script received your POST.",
      received: data, sheet_name: sheet.getName(),
      data_rows: Math.max(0, sheet.getLastRow()-1)
    });
    else return buildResponse({ ok: false, error: "Unknown action: " + action });
  } catch(err) {
    Logger.log("Handler error: " + err.message);
    return buildResponse({ ok: false, error: "Handler error: " + err.message });
  }
}

function handleRead(sheet) {
  var all = sheet.getDataRange().getValues();
  if (all.length < 2) return buildResponse({ ok: true, items: [] });
  var headers = all[0].map(function(h){ return String(h).trim(); });
  var items = [];
  for (var i = 1; i < all.length; i++) {
    var obj = {};
    headers.forEach(function(h,c){ obj[h] = String(all[i][c]||"").trim(); });
    if (!obj.id) obj.id = "sheet-row-"+i;
    if (obj.title) items.push(obj);
  }
  Logger.log("read → "+items.length+" items");
  return buildResponse({ ok: true, count: items.length, items: items });
}

function handleCreate(sheet, item) {
  if (!item||!item.title) return buildResponse({ ok: false, error: "title required." });
  var headers = getHeaders(sheet);
  if (headers.length===0) { sheet.appendRow(CANONICAL_HEADERS); headers=CANONICAL_HEADERS.slice(); }
  if (!item.id) item.id = "item-"+new Date().getTime().toString(36);
  if (!item.created_at) item.created_at = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  sheet.appendRow(headers.map(function(h){ return item[h]!==undefined ? String(item[h]) : ""; }));
  Logger.log("create: id="+item.id+" title="+item.title);
  return buildResponse({ ok: true, id: item.id, message: "Item created." });
}

function handleEdit(sheet, id, updates) {
  if (!id) return buildResponse({ ok: false, error: "id required." });
  var all = sheet.getDataRange().getValues();
  if (all.length<2) return buildResponse({ ok: false, error: "No data rows." });
  var headers = all[0].map(function(h){ return String(h).trim(); });
  var idCol = headers.indexOf("id");
  for (var i = 1; i < all.length; i++) {
    var cellId = idCol>=0 ? String(all[i][idCol]).trim() : "";
    if (cellId===id || ("sheet-row-"+i)===id) {
      headers.forEach(function(h,c){
        if (updates[h]!==undefined) sheet.getRange(i+1,c+1).setValue(String(updates[h]));
      });
      Logger.log("edit: row "+(i+1)+" id="+id);
      return buildResponse({ ok: true, message: "Row "+(i+1)+" updated." });
    }
  }
  return buildResponse({ ok: false, error: "No row with id: "+id });
}

function handleDelete(sheet, id) {
  if (!id) return buildResponse({ ok: false, error: "id required." });
  var all = sheet.getDataRange().getValues();
  if (all.length<2) return buildResponse({ ok: false, error: "No data rows." });
  var headers = all[0].map(function(h){ return String(h).trim(); });
  var idCol = headers.indexOf("id");
  for (var i = 1; i < all.length; i++) {
    var cellId = idCol>=0 ? String(all[i][idCol]).trim() : "";
    if (cellId===id || ("sheet-row-"+i)===id) {
      sheet.deleteRow(i+1);
      Logger.log("delete: row "+(i+1)+" id="+id);
      return buildResponse({ ok: true, message: "Row "+(i+1)+" deleted." });
    }
  }
  return buildResponse({ ok: false, error: "No row with id: "+id });
}

function getHeaders(sheet) {
  var last = sheet.getLastColumn();
  if (last===0) return [];
  return sheet.getRange(1,1,1,last).getValues()[0].map(function(h){ return String(h).trim(); });
}

function buildResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}`;
