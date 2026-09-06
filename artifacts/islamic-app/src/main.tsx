import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "./lib/notifications";
import { initDefaults } from "./lib/settings";
import { initNative } from "./lib/native-init";

async function bootstrap() {
  // Resolve the one-time country/language default before the first render so
  // screens never observe a temporary fallback language.
  await initDefaults();

  // Boot native plugins (status bar, splash, notification channel)
  // This runs async — native setup follows the initial defaults.
  initNative();

  // Register Service Worker for background Islamic notifications (web/PWA path)
  registerSW();

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
