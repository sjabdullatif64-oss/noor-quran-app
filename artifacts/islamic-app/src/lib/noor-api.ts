import { Capacitor } from "@capacitor/core";

const configuredApiDomain = (
  import.meta.env.VITE_API_DOMAIN ||
  "noor-quran.replit.app"
).replace(/\/+$/, "").replace(/\/api$/, "");

const REPLIT_DOMAIN = configuredApiDomain.startsWith("http")
  ? configuredApiDomain
  : `https://${configuredApiDomain}`;

export const API_BASE = Capacitor.isNativePlatform()
  ? `${REPLIT_DOMAIN}/api`
  : "/api";

async function noorFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers as Record<string, string>),
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface NoorUser {
  id: string;
  deviceId: string;
  coinsBalance: number;
  totalCoinsEarned: number;
  createdAt: string;
}

export interface NoorTeacherAccount {
  id: string;
  userId: string;
  recoveryKey: string;
  account: {
    storage?: Record<string, string>;
    progress?: Record<string, unknown> | null;
    practice?: Record<string, unknown> | null;
  };
  updatedAt: string;
}

export interface NoorProduct {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  contactInfo: string;
  productLink: string | null;
  category: string;
  status: "pending" | "approved" | "rejected";
  promotionType: "none" | "1day" | "7day";
  promotionExpiry: string | null;
  coinsSpent: number;
  submittedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

export interface NoorWelcomeCampaign {
  id: string;
  imageUrl: string | null;
  gifUrl: string | null;
  videoUrl: string | null;
  title: string;
  description: string;
  buttonText: string | null;
  url: string | null;
  durationSeconds: number;
  enabled: boolean;
}

export const noorApi = {
  async register(
    deviceId: string,
    persistentDeviceId?: string,
  ): Promise<{ user: NoorUser; isNew: boolean; teacherAccount: NoorTeacherAccount }> {
    return noorFetch("/users/register", {
      method: "POST",
      body: JSON.stringify({ deviceId, persistentDeviceId }),
    });
  },

  async saveTeacherAccount(
    deviceId: string,
    recoveryKey: string,
    storage: Record<string, string>,
    progress: Record<string, unknown> | null,
    practice: Record<string, unknown> | null,
  ): Promise<{ teacherAccount: NoorTeacherAccount }> {
    return noorFetch("/users/teacher-account", {
      method: "POST",
      body: JSON.stringify({ deviceId, recoveryKey, storage, progress, practice }),
    });
  },

  async restoreTeacherAccount(
    deviceId: string,
    recoveryKey: string,
  ): Promise<{ teacherAccount: NoorTeacherAccount }> {
    return noorFetch("/users/restore-teacher", {
      method: "POST",
      body: JSON.stringify({ deviceId, recoveryKey }),
    });
  },

  async ayahReward(
    deviceId: string,
    surahNumber: number,
    ayahNumber: number,
  ): Promise<{ awarded: boolean; coins: number; amount?: number }> {
    return noorFetch("/coins/ayah-reward", {
      method: "POST",
      body: JSON.stringify({ deviceId, surahNumber, ayahNumber }),
    });
  },

  async getProducts(): Promise<{ products: NoorProduct[] }> {
    return noorFetch("/products");
  },

  async getFeaturedProducts(): Promise<{ products: NoorProduct[] }> {
    return noorFetch("/products/featured");
  },

  async getWelcomeCampaigns(): Promise<{ campaigns: NoorWelcomeCampaign[] }> {
    return noorFetch("/campaigns/welcome");
  },

};
