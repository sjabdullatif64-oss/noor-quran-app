export const PROMOTION_COINS = {
  none:  0,
  "1day": 100,
  "7day": 200,
} as const;

export type PromotionType = keyof typeof PROMOTION_COINS;
