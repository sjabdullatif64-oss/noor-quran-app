/**
 * Noor Quran — Production Static Server
 * Custom server to ensure correct MIME types + CORS headers for PWABuilder / TWA.
 */
import http  from "http";
import fs    from "fs";
import path  from "path";
import { fileURLToPath } from "url";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const PORT       = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "dist", "public");

const MIME = {
  ".html":        "text/html; charset=utf-8",
  ".js":          "application/javascript; charset=utf-8",
  ".mjs":         "application/javascript; charset=utf-8",
  ".css":         "text/css; charset=utf-8",
  ".json":        "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png":         "image/png",
  ".jpg":         "image/jpeg",
  ".jpeg":        "image/jpeg",
  ".webp":        "image/webp",
  ".svg":         "image/svg+xml",
  ".ico":         "image/x-icon",
  ".txt":         "text/plain; charset=utf-8",
  ".xml":         "application/xml",
  ".woff":        "font/woff",
  ".woff2":       "font/woff2",
  ".ttf":         "font/ttf",
  ".mp3":         "audio/mpeg",
};

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

function send(res, status, headers, body) {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(body);
}

function serveStatic(res, filePath) {
  const ext         = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  try {
    const body = fs.readFileSync(filePath);
    send(res, 200, { "Content-Type": contentType, "Content-Length": body.length }, body);
    return true;
  } catch {
    return false;
  }
}

function serveSPA(res) {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  const body      = fs.readFileSync(indexPath);
  send(res, 200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": body.length }, body);
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, {}, null);
    return;
  }

  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.join(PUBLIC_DIR, urlPath);

  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      serveStatic(res, filePath);
      return;
    }
    if (stat.isDirectory()) {
      const idx = path.join(filePath, "index.html");
      if (fs.existsSync(idx)) { serveStatic(res, idx); return; }
    }
  } catch { /* not found — fall through to SPA */ }

  try {
    serveSPA(res);
  } catch (e) {
    send(res, 500, { "Content-Type": "text/plain" }, "Server error: " + e.message);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Noor Quran production server running on port ${PORT}`);
  console.log(`Serving: ${PUBLIC_DIR}`);
});
