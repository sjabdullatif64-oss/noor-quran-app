const CONSENT_STORAGE_KEY = "noor-legal-consent";

/**
 * Update this value whenever the Terms of Service or Privacy Policy is
 * materially updated. Existing users will then be asked to consent again.
 */
export const CURRENT_CONSENT_VERSION = "2026-08-06";

export type ConsentStatus = "accepted" | "missing" | "stale";

interface StoredConsent {
  accepted: true;
  version: string;
}

function readStoredConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("accepted" in parsed) ||
      !("version" in parsed) ||
      parsed.accepted !== true ||
      typeof parsed.version !== "string"
    ) {
      return null;
    }

    return parsed as StoredConsent;
  } catch {
    return null;
  }
}

export function getConsentStatus(
  currentVersion = CURRENT_CONSENT_VERSION,
): ConsentStatus {
  const stored = readStoredConsent();
  if (!stored) return "missing";
  return stored.version === currentVersion ? "accepted" : "stale";
}

export function hasCurrentConsent(
  currentVersion = CURRENT_CONSENT_VERSION,
): boolean {
  return getConsentStatus(currentVersion) === "accepted";
}

export function acceptConsent(
  version = CURRENT_CONSENT_VERSION,
): boolean {
  try {
    const consent: StoredConsent = { accepted: true, version };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    return true;
  } catch {
    // If storage is unavailable, the gate must remain visible.
    return false;
  }
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage in tests or restricted browser contexts.
  }
}
