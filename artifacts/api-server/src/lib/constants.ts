export const PROMOTION_COINS = {
  none:  0,
  "1day": 100,
  "7day": 200,
} as const;

export const PROMOTION_HOURS = {
  none:  0,
  "1day": 24,
  "7day": 24,
} as const;

export type PromotionType = keyof typeof PROMOTION_COINS;
