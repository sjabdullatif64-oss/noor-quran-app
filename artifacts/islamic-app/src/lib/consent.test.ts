import assert from "node:assert/strict";
import {
  acceptConsent,
  clearConsent,
  CURRENT_CONSENT_VERSION,
  getConsentStatus,
  hasCurrentConsent,
} from "./consent";

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

clearConsent();
assert.equal(getConsentStatus(), "missing");
assert.equal(hasCurrentConsent(), false);

acceptConsent();
assert.equal(getConsentStatus(), "accepted");
assert.equal(hasCurrentConsent(), true);

acceptConsent("2026-08-07");
assert.equal(getConsentStatus(), "stale");
assert.equal(getConsentStatus("2026-08-07"), "accepted");

clearConsent();
localStorage.setItem("noor-legal-consent", JSON.stringify({ accepted: false, version: CURRENT_CONSENT_VERSION }));
assert.equal(getConsentStatus(), "missing");

localStorage.setItem("noor-legal-consent", "not-json");
assert.equal(getConsentStatus(), "missing");

console.log("consent tests passed");
