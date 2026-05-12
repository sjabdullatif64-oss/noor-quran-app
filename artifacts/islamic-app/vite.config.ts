import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// PORT / BASE_PATH default gracefully so plain `vite build` never throws.
const rawPort  = process.env.PORT      ?? "3000";
const basePath = process.env.BASE_PATH ?? "/";
const port     = Number(rawPort);

// Replit dev domain — used to route HMR WebSocket through the proxy correctly.
// REPLIT_DOMAINS is comma-separated; take the first entry.
const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() ?? "";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    // Route HMR WebSocket through the Replit reverse proxy (WSS on port 443)
    // so browsers inside the preview iframe can actually receive hot updates.
    hmr: replitDomain
      ? { host: replitDomain, clientPort: 443, protocol: "wss" }
      : true,
    fs: { strict: true },
    // Disable caching in dev so the browser always loads the latest modules.
    headers: {
      "Cache-Control": "no-store",
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
