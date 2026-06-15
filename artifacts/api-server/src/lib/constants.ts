export const PROMOTION_COINS = {
  none:  0,
  "1day": 100,
  "7day": 250,
} as const;

export const PROMOTION_HOURS = {
  none:  0,
  "1day": 24,
  "7day": 168,
} as const;

export type PromotionType = keyof typeof PROMOTION_COINS;
