import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const coinTransactionsTable = pgTable("coin_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  eventKey: text("event_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCoinTransactionSchema = createInsertSchema(
  coinTransactionsTable
).omit({ id: true, createdAt: true });
export type InsertCoinTransaction = z.infer<typeof insertCoinTransactionSchema>;
export type CoinTransaction = typeof coinTransactionsTable.$inferSelect;
