import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const PRODUCT_STATUSES = ["pending", "approved", "rejected"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PROMOTION_TYPES = ["none", "1day", "7day"] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const PRODUCT_CATEGORIES = [
  "tasbeeh",
  "prayer_mat",
  "books",
  "attar",
  "courses",
  "other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PROMOTION_COINS: Record<PromotionType, number> = {
  none: 0,
  "1day": 100,
  "7day": 250,
};

export const PROMOTION_HOURS: Record<PromotionType, number> = {
  none: 0,
  "1day": 24,
  "7day": 24 * 7,
};

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  contactInfo: text("contact_info").notNull(),
  productLink: text("product_link"),
  category: text("category").notNull(),
  status: text("status").notNull().default("pending"),
  promotionType: text("promotion_type").notNull().default("none"),
  promotionExpiry: timestamp("promotion_expiry"),
  coinsSpent: integer("coins_spent").notNull().default(0),
  submittedBy: text("submitted_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
