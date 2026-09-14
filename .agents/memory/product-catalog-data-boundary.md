---
name: Product catalog data boundary
description: Legacy Product rows, authoritative IDs, and image persistence rules for Admin catalog changes
---

Product Catalog rows may contain historical category strings and status aliases such as `approve`; normalize status to the canonical `approved|pending|rejected` API values on read, preserve unknown legacy categories during edits, and keep the route ID authoritative.

**Why:** Existing Google Sheets data predates the Admin schema, so strict edit validation can reject valid legacy rows and mutable-field lookup can target the wrong record.

New Admin product data URLs must be uploaded through Object Storage before writing the short media path to Google Sheets. Existing unchanged image values must not be re-uploaded during ordinary edits.

**Why:** Google Sheets cells cannot safely carry the Admin image preparation budget, while existing product records already use both data URLs and short media values.

**How to apply:** Keep create validation strict for new category/status values, make patch validation tolerant of stored category values, trim/encode product IDs at the Admin boundary, and resolve stored media paths through `API_BASE` in Admin and public marketplace image components.