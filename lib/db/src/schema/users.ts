import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: text("device_id").notNull().unique(),
  referralCode: text("referral_code").notNull().unique(),
  referredById: uuid("referred_by_id").references(
    (): AnyPgColumn => usersTable.id,
    { onDelete: "set null" }
  ),
  coinsBalance: integer("coins_balance").notNull().default(0),
  totalReferrals: integer("total_referrals").notNull().default(0),
  totalCoinsEarned: integer("total_coins_earned").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
