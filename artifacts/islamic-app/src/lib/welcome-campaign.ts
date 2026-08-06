import type { NoorWelcomeCampaign } from "@/lib/noor-api";

export const WELCOME_CAMPAIGN_LAST_ID_KEY = "noor-welcome-campaign-last-id";

export type WelcomeCampaign = Pick<
  NoorWelcomeCampaign,
  | "id"
  | "imageUrl"
  | "gifUrl"
  | "videoUrl"
  | "title"
  | "description"
  | "buttonText"
  | "url"
  | "durationSeconds"
>;

export type WelcomeCampaignMediaKind = "video" | "gif" | "image" | "none";

export function isValidWelcomeCampaignUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return Boolean(parsed.hostname);
    }
    return ["mailto:", "tel:", "market:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export interface WelcomeCampaignMedia {
  kind: WelcomeCampaignMediaKind;
  src: string | null;
  poster: string | null;
}

function usableUrl(value: string | null | undefined): string | null {
  return value?.trim() ? value : null;
}

/** Resolves the most expressive available asset, while keeping a still image as a video poster. */
export function getWelcomeCampaignMedia(
  campaign: Pick<WelcomeCampaign, "videoUrl" | "gifUrl" | "imageUrl">,
): WelcomeCampaignMedia {
  const image = usableUrl(campaign.imageUrl);
  const video = usableUrl(campaign.videoUrl);
  const gif = usableUrl(campaign.gifUrl);

  if (video) {
    return { kind: "video", src: video, poster: image };
  }
  if (gif) {
    return { kind: "gif", src: gif, poster: image };
  }
  if (image) {
    return { kind: "image", src: image, poster: null };
  }
  return { kind: "none", src: null, poster: null };
}

export function getWelcomeCampaignDurationSeconds(durationSeconds: number): number {
  return Number.isFinite(durationSeconds) && durationSeconds > 0
    ? Math.max(1, Math.round(durationSeconds))
    : 1;
}

export function getNextWelcomeCampaign(
  campaigns: WelcomeCampaign[],
  lastDisplayedId: string | null,
): WelcomeCampaign | null {
  if (campaigns.length === 0) return null;
  if (campaigns.length === 1) return campaigns[0];

  const lastIndex = lastDisplayedId
    ? campaigns.findIndex((campaign) => campaign.id === lastDisplayedId)
    : -1;
  return campaigns[(lastIndex + 1 + campaigns.length) % campaigns.length];
}

export function readLastWelcomeCampaignId(): string | null {
  try {
    return localStorage.getItem(WELCOME_CAMPAIGN_LAST_ID_KEY);
  } catch {
    return null;
  }
}

export function rememberWelcomeCampaign(id: string): void {
  try {
    localStorage.setItem(WELCOME_CAMPAIGN_LAST_ID_KEY, id);
  } catch {
    // Storage can be unavailable in private browsing; campaign display still works.
  }
}