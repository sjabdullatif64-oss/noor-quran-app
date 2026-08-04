import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "./lib/notifications";
import { initDefaults } from "./lib/settings";
import { initNative } from "./lib/native-init";

// Establish first-launch defaults, including locale-based Quran translation.
initDefaults();

// Boot native plugins (status bar, splash, notification channel)
// This runs async — app renders immediately, native setup follows
initNative();

// Register Service Worker for background Islamic notifications (web/PWA path)
registerSW();

createRoot(document.getElementById("root")!).render(<App />);
