/**
 * Noor Quran — Google Apps Script Web App
 * =========================================
 * Provides full CRUD write access to the Noor Quran Updates Google Sheet.
 *
 * SHEET ID : 1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw
 * SHEET URL: https://docs.google.com/spreadsheets/d/1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw
 *
 * ── Expected Sheet Columns (Row 1 = headers) ─────────────────────────────────
 *  Column A : id           — unique identifier (auto-generated if empty)
 *  Column B : title        — item title (required)
 *  Column C : description  — short description
 *  Column D : image_url    — Google Drive share link or direct image URL
 *  Column E : video_url    — YouTube or other video URL
 *  Column F : button_text  — label for the action button (e.g. "Watch", "Read")
 *  Column G : target_link  — URL opened when the button is tapped
 *  Column H : category     — Quran | Prayer | Event | Feature | Update | General
 *  Column I : status       — "active" = visible in app, anything else = hidden
 *  Column J : created_at   — date string (e.g. 2025-01-15), shown in the card
 *
 * ── Deployment Steps ─────────────────────────────────────────────────────────
 *  1. Open: https://script.google.com  → click "New project"
 *  2. Delete the empty function, paste THIS entire file
 *  3. Save (Ctrl+S) — name it anything (e.g. "Noor Quran API")
 *  4. Click "Deploy" → "New deployment"
 *  5. Click the gear icon → select "Web app"
 *  6. Description: "Noor Quran Sheet API v1"
 *  7. Execute as:      Me  (your Google account)
 *  8. Who has access:  Anyone
 *  9. Click "Deploy" → authorise when prompted → copy the Web App URL
 * 10. Paste that URL in the Admin Panel → Google Sheet Sync → Save URL
 *
 * ── API Endpoints ────────────────────────────────────────────────────────────
 *  GET  <webAppUrl>                          — health check (returns {ok:true})
 *  POST <webAppUrl>  body: JSON string
 *
 *  POST actions (send as plain text body):
 *    { "action": "read" }
 *    { "action": "create", "item": { title, description, image_url, ... } }
 *    { "action": "edit",   "id": "...", "item": { title, status, ... } }
 *    { "action": "delete", "id": "..." }
 *
 *  All responses: { "ok": true|false, "error"?: "..." , ... }
 */

// ── Configuration ─────────────────────────────────────────────────────────────

/** Change only if your tab has a different name. The script falls back to
 *  the first sheet if this name is not found. */
var SHEET_NAME = "Sheet1";

/** Canonical column order written when the sheet is empty. */
var CANONICAL_HEADERS = [
  "id", "title", "description", "image_url", "video_url",
  "button_text", "target_link", "category", "status", "created_at"
];

// ── Entry points ──────────────────────────────────────────────────────────────

function doGet() {
  return buildResponse({ ok: true, message: "Noor Quran Sheet API is live." });
}

function doPost(e) {
  try {
    var raw = e && e.postData ? e.postData.contents : "";
    if (!raw || raw.trim() === "") {
      return buildResponse({ ok: false, error: "Empty request body." });
    }

    var data = JSON.parse(raw);
    var action = (data.action || "").toLowerCase();
    var sheet  = getSheet_();

    if      (action === "read")   return handleRead_(sheet);
    else if (action === "create") return handleCreate_(sheet, data.item);
    else if (action === "edit")   return handleEdit_(sheet, String(data.id || ""), data.item);
    else if (action === "delete") return handleDelete_(sheet, String(data.id || ""));
    else return buildResponse({ ok: false, error: "Unknown action: " + action });

  } catch (err) {
    return buildResponse({ ok: false, error: "Script error: " + err.message });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * READ — returns all rows as JSON objects.
 * Note: the app already reads the sheet via the public GViz URL; this endpoint
 * is provided for completeness and admin verification.
 */
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
    // Provide generated id if the sheet's id cell is blank
    if (!item.id) item.id = "sheet-row-" + i;
    if (item.title) items.push(item);
  }

  return buildResponse({ ok: true, count: items.length, items: items });
}

/**
 * CREATE — appends a new row to the sheet.
 * Initialises the header row if the sheet is completely empty.
 */
function handleCreate_(sheet, item) {
  if (!item || !item.title || String(item.title).trim() === "") {
    return buildResponse({ ok: false, error: "'title' field is required." });
  }

  var headers = getHeaders_(sheet);

  // Bootstrap headers if sheet is empty
  if (headers.length === 0) {
    sheet.appendRow(CANONICAL_HEADERS);
    headers = CANONICAL_HEADERS.slice();
  }

  // Assign a unique id if the incoming item does not have one
  if (!item.id || String(item.id).trim() === "") {
    item.id = "item-" + new Date().getTime().toString(36);
  }
  // Default date to today
  if (!item.created_at || String(item.created_at).trim() === "") {
    item.created_at = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  var row = headers.map(function(h) {
    return item[h] !== undefined ? String(item[h]) : "";
  });
  sheet.appendRow(row);

  return buildResponse({ ok: true, id: item.id, message: "Item created successfully." });
}

/**
 * EDIT — finds the row by id (or generated "sheet-row-N") and updates
 * every field present in the `item` object.
 */
function handleEdit_(sheet, id, updates) {
  if (!id) return buildResponse({ ok: false, error: "'id' is required for edit." });
  if (!updates || typeof updates !== "object") {
    return buildResponse({ ok: false, error: "'item' object is required for edit." });
  }

  var all = sheet.getDataRange().getValues();
  if (all.length < 2) return buildResponse({ ok: false, error: "Sheet has no data rows." });

  var headers = all[0].map(function(h) { return String(h).trim(); });
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
      // If the row had no id and we matched by generated id, write the id now
      if (idColIdx >= 0 && !cellId && updates.id) {
        sheet.getRange(i + 1, idColIdx + 1).setValue(String(updates.id));
      }
      return buildResponse({ ok: true, message: "Row " + (i + 1) + " updated." });
    }
  }

  return buildResponse({ ok: false, error: "No row found with id: " + id });
}

/**
 * DELETE — finds the row by id (or generated "sheet-row-N") and removes it.
 */
function handleDelete_(sheet, id) {
  if (!id) return buildResponse({ ok: false, error: "'id' is required for delete." });

  var all = sheet.getDataRange().getValues();
  if (all.length < 2) return buildResponse({ ok: false, error: "Sheet has no data rows." });

  var headers  = all[0].map(function(h) { return String(h).trim(); });
  var idColIdx = headers.indexOf("id");

  for (var i = 1; i < all.length; i++) {
    var cellId    = idColIdx >= 0 ? String(all[i][idColIdx]).trim() : "";
    var generated = "sheet-row-" + i;

    if (cellId === id || generated === id) {
      sheet.deleteRow(i + 1);
      return buildResponse({ ok: true, message: "Row " + (i + 1) + " deleted." });
    }
  }

  return buildResponse({ ok: false, error: "No row found with id: " + id });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

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
