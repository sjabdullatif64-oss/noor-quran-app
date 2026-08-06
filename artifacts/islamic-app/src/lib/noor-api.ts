import { Capacitor } from "@capacitor/core";

const REPLIT_DOMAIN =
  import.meta.env.VITE_API_DOMAIN ||
  "noor-quran.replit.app";

export const API_BASE = Capacitor.isNativePlatform()
  ? `https://${REPLIT_DOMAIN}/api`
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
  referredById: string | null;
  coinsBalance: number;
  totalReferrals: number;
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
    referredById?: string,
    persistentDeviceId?: string,
  ): Promise<{ user: NoorUser; isNew: boolean; teacherAccount: NoorTeacherAccount }> {
    return noorFetch("/users/register", {
      method: "POST",
      body: JSON.stringify({ deviceId, referredById, persistentDeviceId }),
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

  async adminGetPending(
    adminToken: string,
  ): Promise<{ products: { product: NoorProduct; user: { id: string; deviceId: string; coinsBalance: number } | null }[] }> {
    return noorFetch("/admin/products/pending", {
      headers: { "x-admin-token": adminToken },
    });
  },

  async adminGetAll(
    adminToken: string,
  ): Promise<{ products: { product: NoorProduct; user: { id: string; deviceId: string } | null }[] }> {
    return noorFetch("/admin/products/all", {
      headers: { "x-admin-token": adminToken },
    });
  },

  async adminCreateProduct(
    adminToken: string,
    data: {
      title: string;
      description: string;
      imageUrl?: string;
      contactInfo: string;
      productLink?: string;
      category: string;
      submittedBy?: string;
      featured?: boolean;
    },
  ): Promise<{ product: NoorProduct }> {
    return noorFetch("/admin/products", {
      method: "POST",
      headers: { "x-admin-token": adminToken },
      body: JSON.stringify(data),
    });
  },

  async adminApprove(
    adminToken: string,
    productId: string,
  ): Promise<{ product: NoorProduct }> {
    return noorFetch(`/admin/products/${productId}/approve`, {
      method: "POST",
      headers: { "x-admin-token": adminToken },
    });
  },

  async adminReject(
    adminToken: string,
    productId: string,
    rejectionReason?: string,
  ): Promise<{ product: NoorProduct; coinsRefunded: number }> {
    return noorFetch(`/admin/products/${productId}/reject`, {
      method: "POST",
      headers: { "x-admin-token": adminToken },
      body: JSON.stringify({ rejectionReason }),
    });
  },

  async adminSetFeatured(
    adminToken: string,
    productId: string,
    featured: boolean,
  ): Promise<{ product: NoorProduct }> {
    return noorFetch(`/admin/products/${productId}/feature`, {
      method: "POST",
      headers: { "x-admin-token": adminToken },
      body: JSON.stringify({ featured }),
    });
  },

  async adminDelete(
    adminToken: string,
    productId: string,
  ): Promise<{ deleted: boolean }> {
    return noorFetch(`/admin/products/${productId}`, {
      method: "DELETE",
      headers: { "x-admin-token": adminToken },
    });
  },

  async adminEditProduct(
    adminToken: string,
    productId: string,
    data: {
      title?: string;
      description?: string;
      imageUrl?: string;
      contactInfo?: string;
      productLink?: string;
      category?: string;
      submittedBy?: string;
    },
  ): Promise<{ product: NoorProduct }> {
    return noorFetch(`/admin/products/${productId}`, {
      method: "PATCH",
      headers: { "x-admin-token": adminToken },
      body: JSON.stringify(data),
    });
  },
};
