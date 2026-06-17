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

export interface CoinTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  eventKey: string | null;
  createdAt: string;
}

export interface ProfileStats {
  totalProducts: number;
  pendingProducts: number;
  rejectedProducts: number;
  activePromotions: number;
}

export const noorApi = {
  async register(
    deviceId: string,
    referredById?: string,
  ): Promise<{ user: NoorUser; isNew: boolean }> {
    return noorFetch("/users/register", {
      method: "POST",
      body: JSON.stringify({ deviceId, referredById }),
    });
  },

  async getProfile(
    deviceId: string,
  ): Promise<{ user: NoorUser; stats: ProfileStats; recentTransactions: CoinTransaction[] }> {
    return noorFetch(`/users/${deviceId}/profile`);
  },

  async dailyCheckin(
    deviceId: string,
  ): Promise<{ awarded: boolean; coins: number; amount?: number; message?: string }> {
    return noorFetch("/coins/daily-checkin", {
      method: "POST",
      body: JSON.stringify({ deviceId }),
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

  async getMyProducts(deviceId: string): Promise<{ products: NoorProduct[] }> {
    return noorFetch(`/products/my/${deviceId}`);
  },

  async getProduct(productId: string): Promise<{ product: NoorProduct }> {
    return noorFetch(`/products/${productId}`);
  },

  async submitProduct(data: {
    deviceId: string;
    title: string;
    description: string;
    imageUrl?: string;
    contactInfo: string;
    productLink?: string;
    category: string;
    promotionType: "1day" | "7day";
    submittedBy?: string;
  }): Promise<{ product: NoorProduct }> {
    return noorFetch("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async editProduct(
    productId: string,
    deviceId: string,
    data: {
      title?: string;
      description?: string;
      imageUrl?: string;
      contactInfo?: string;
      productLink?: string;
      category?: string;
    },
  ): Promise<{ product: NoorProduct }> {
    return noorFetch(`/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ deviceId, ...data }),
    });
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
