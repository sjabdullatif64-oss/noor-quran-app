import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "./lib/notifications";
import { initDefaults } from "./lib/settings";

// Guarantee clean first-launch defaults (Urdu language, etc.)
initDefaults();

// Register Service Worker for background Islamic notifications
registerSW();

createRoot(document.getElementById("root")!).render(<App />);
