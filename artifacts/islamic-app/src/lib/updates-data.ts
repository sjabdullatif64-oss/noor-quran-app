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

const SHEET_ID = "1sXPeYJ8X671aypFr6P1MjwTsj93-ExMslXvnF2R1cHw";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

export function resolveImageUrl(url: string): string {
  if (!url || url.startsWith("data:")) return url;

  let fileId: string | null = null;
  const filePath = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePath) fileId = filePath[1];

  if (!fileId) {
    const openUrl = url.match(/drive\.google\.com\/open\?.*?id=([a-zA-Z0-9_-]+)/);
    if (openUrl) fileId = openUrl[1];
  }

  if (!fileId && url.includes("drive.google.com/uc")) {
    const ucUrl = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucUrl) fileId = ucUrl[1];
  }

  if (!fileId && url.includes("drive.google.com/thumbnail")) {
    const thumbnailUrl = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (thumbnailUrl) fileId = thumbnailUrl[1];
  }

  if (!fileId && url.includes("lh3.googleusercontent.com/d/")) {
    const contentUrl = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
    if (contentUrl) fileId = contentUrl[1];
  }

  return fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : url;
}

export function parseGViz(text: string): UpdateItem[] {
  try {
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
    if (!match) return [];

    const data = JSON.parse(match[1]) as {
      status: string;
      table: {
        cols: Array<{ label: string }>;
        rows: Array<{ c: Array<{ v: string | number | null } | null> }>;
      };
    };
    if (data.status !== "ok") return [];

    const headers = data.table.cols.map((column) => column.label?.trim() ?? "");
    return data.table.rows.flatMap((row, rowIndex) => {
      const item: Record<string, string> = {};
      headers.forEach((header, index) => {
        const value = row.c?.[index]?.v;
        item[header] = value == null ? "" : String(value).trim();
      });
      if (!item.title || item.status?.toLowerCase() !== "active") return [];
      if (!item.id) item.id = `sheet-row-${rowIndex}`;
      return [item as unknown as UpdateItem];
    });
  } catch {
    return [];
  }
}

export async function fetchUpdates(): Promise<UpdateItem[]> {
  const response = await fetch(SHEET_URL, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Sheet fetch failed: HTTP ${response.status}`);
  }
  return parseGViz(await response.text());
}