/**
 * Noor Quran — Google Apps Script Web App
 * =========================================
 * Provides full CRUD write access to the Noor Quran Updates Google Sheet.
 *
 * SHEET ID : 1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw
 *
 * ── Deployment Steps ─────────────────────────────────────────────────────────
 *  1. Open: https://script.google.com  → open your existing project
 *  2. DELETE all existing code and paste THIS entire file
 *  3. Save (Ctrl+S)
 *  4. Click "Deploy" → "Manage deployments" → ✏ Edit latest → "New version"
 *     (or "New deployment" → Web app if first time)
 *  5. Execute as: Me  |  Who has access: Anyone
 *  6. Click "Deploy" → copy the Web App URL
 *
 * ── Quick test (after deploy) ────────────────────────────────────────────────
 *  Open this URL in your browser — you should see JSON with sheet info:
 *    https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 *
 * ── Sheet Columns (Row 1 = headers) ─────────────────────────────────────────
 *  A=id  B=title  C=description  D=image_url  E=video_url
 *  F=button_text  G=target_link  H=category  I=status  J=created_at
 *
 * ── Image URLs ───────────────────────────────────────────────────────────────
 *  Use the standard Google Drive share link for images:
 *    https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *  IMPORTANT: File must be shared as "Anyone with the link can view"
 */

// ── Configuration ─────────────────────────────────────────────────────────────

/** Target spreadsheet — uses openById so this works as a standalone script. */
var SHEET_ID = "1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw";

/** Sheet tab name. If you renamed the tab, update this. */
var SHEET_NAME = "Sheet1";

/** Canonical column order — written automatically when sheet is empty. */
var CANONICAL_HEADERS = [
  "id", "title", "description", "image_url", "video_url",
  "button_text", "target_link", "category", "status", "created_at"
];

// ── Entry points ──────────────────────────────────────────────────────────────

/**
 * GET handler — used to test that the script is deployed and reachable.
 * Open the Web App URL in a browser; you should see JSON with sheet info.
 */
function doGet(e) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    var rows  = Math.max(0, sheet.getLastRow() - 1); // exclude header
    return buildResponse({
      ok:         true,
      message:    "Noor Quran Sheet API is live.",
      sheet_name: sheet.getName(),
      data_rows:  rows,
      sheet_url:  "https://docs.google.com/spreadsheets/d/" + SHEET_ID
    });
  } catch (err) {
    return buildResponse({ ok: false, error: "doGet error: " + err.message });
  }
}

/**
 * POST handler — receives JSON from the app.
 * Supported actions: "read" | "create" | "edit" | "delete" | "test"
 */
function doPost(e) {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  var raw = "";
  try { raw = e && e.postData ? e.postData.contents : ""; } catch (_) {}

  Logger.log("doPost called — raw body: " + raw);

  if (!raw || raw.trim() === "") {
    Logger.log("Empty body — returning error");
    return buildResponse({ ok: false, error: "Empty request body." });
  }

  var data;
  try {
    data = JSON.parse(raw);
  } catch (parseErr) {
    Logger.log("JSON parse error: " + parseErr.message);
    return buildResponse({ ok: false, error: "Invalid JSON: " + parseErr.message });
  }

  var action = String(data.action || "").toLowerCase();
  Logger.log("action=" + action);

  // ── 2. Open sheet via ID (works for standalone scripts) ───────────────────
  var ss, sheet;
  try {
    ss    = SpreadsheetApp.openById(SHEET_ID);
    sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    Logger.log("Sheet opened: " + sheet.getName() + " (" + sheet.getLastRow() + " rows)");
  } catch (sheetErr) {
    Logger.log("Cannot open sheet: " + sheetErr.message);
    return buildResponse({ ok: false, error: "Cannot open sheet: " + sheetErr.message });
  }

  // ── 3. Dispatch ───────────────────────────────────────────────────────────
  try {
    if      (action === "read")   return handleRead_(sheet);
    else if (action === "create") return handleCreate_(sheet, data.item);
    else if (action === "edit")   return handleEdit_(sheet, String(data.id || ""), data.item);
    else if (action === "delete") return handleDelete_(sheet, String(data.id || ""));
    else if (action === "test") {
      // Simple ping — confirms the script is receiving POST bodies correctly
      return buildResponse({
        ok:         true,
        message:    "Test OK — Apps Script received your POST.",
        received:   data,
        sheet_name: sheet.getName(),
        data_rows:  Math.max(0, sheet.getLastRow() - 1)
      });
    }
    else {
      return buildResponse({ ok: false, error: "Unknown action: " + action });
    }
  } catch (handlerErr) {
    Logger.log("Handler error: " + handlerErr.message);
    return buildResponse({ ok: false, error: "Handler error: " + handlerErr.message });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function handleRead_(sheet) {
  var all = sheet.getDataRange().getValues();
  if (all.length < 2) return buildResponse({ ok: true, items: [] });

  var headers = all[0].map(function(h) { return String(h).trim(); });
  var items   = [];

  for (var i = 1; i < all.length; i++) {
    var row  = all[i];
    var item = {};
    headers.forEach(function(h, c) {
      item[h] = row[c] !== undefined && row[c] !== null ? String(row[c]).trim() : "";
    });
    if (!item.id) item.id = "sheet-row-" + i;
    if (item.title) items.push(item);
  }

  Logger.log("handleRead_ → " + items.length + " items");
  return buildResponse({ ok: true, count: items.length, items: items });
}

function handleCreate_(sheet, item) {
  if (!item || !item.title || String(item.title).trim() === "") {
    return buildResponse({ ok: false, error: "'title' field is required." });
  }

  var headers = getHeaders_(sheet);
  if (headers.length === 0) {
    sheet.appendRow(CANONICAL_HEADERS);
    headers = CANONICAL_HEADERS.slice();
    Logger.log("handleCreate_: wrote header row");
  }

  if (!item.id || String(item.id).trim() === "") {
    item.id = "item-" + new Date().getTime().toString(36);
  }
  if (!item.created_at || String(item.created_at).trim() === "") {
    item.created_at = Utilities.formatDate(
      new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"
    );
  }

  var row = headers.map(function(h) {
    return item[h] !== undefined ? String(item[h]) : "";
  });
  sheet.appendRow(row);

  Logger.log("handleCreate_: appended row id=" + item.id + " title=" + item.title);
  return buildResponse({ ok: true, id: item.id, message: "Item created." });
}

function handleEdit_(sheet, id, updates) {
  if (!id) return buildResponse({ ok: false, error: "'id' is required for edit." });
  if (!updates || typeof updates !== "object") {
    return buildResponse({ ok: false, error: "'item' object is required for edit." });
  }

  var all     = sheet.getDataRange().getValues();
  if (all.length < 2) return buildResponse({ ok: false, error: "Sheet has no data rows." });

  var headers  = all[0].map(function(h) { return String(h).trim(); });
  var idColIdx = headers.indexOf("id");

  for (var i = 1; i < all.length; i++) {
    var cellId    = idColIdx >= 0 ? String(all[i][idColIdx]).trim() : "";
    var generated = "sheet-row-" + i;

    if (cellId === id || generated === id) {
      headers.forEach(function(h, c) {
        if (updates[h] !== undefined) {
          sheet.getRange(i + 1, c + 1).setValue(String(updates[h]));
        }
      });
      Logger.log("handleEdit_: updated row " + (i + 1) + " id=" + id);
      return buildResponse({ ok: true, message: "Row " + (i + 1) + " updated." });
    }
  }

  Logger.log("handleEdit_: no row found with id=" + id);
  return buildResponse({ ok: false, error: "No row found with id: " + id });
}

function handleDelete_(sheet, id) {
  if (!id) return buildResponse({ ok: false, error: "'id' is required for delete." });

  var all     = sheet.getDataRange().getValues();
  if (all.length < 2) return buildResponse({ ok: false, error: "Sheet has no data rows." });

  var headers  = all[0].map(function(h) { return String(h).trim(); });
  var idColIdx = headers.indexOf("id");

  for (var i = 1; i < all.length; i++) {
    var cellId    = idColIdx >= 0 ? String(all[i][idColIdx]).trim() : "";
    var generated = "sheet-row-" + i;

    if (cellId === id || generated === id) {
      sheet.deleteRow(i + 1);
      Logger.log("handleDelete_: deleted row " + (i + 1) + " id=" + id);
      return buildResponse({ ok: true, message: "Row " + (i + 1) + " deleted." });
    }
  }

  Logger.log("handleDelete_: no row found with id=" + id);
  return buildResponse({ ok: false, error: "No row found with id: " + id });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getHeaders_(sheet) {
  var last = sheet.getLastColumn();
  if (last === 0) return [];
  return sheet.getRange(1, 1, 1, last).getValues()[0].map(function(h) {
    return String(h).trim();
  });
}

function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
