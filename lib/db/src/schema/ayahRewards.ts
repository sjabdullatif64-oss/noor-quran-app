import { pgTable, integer, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const ayahRewardsTable = pgTable(
  "ayah_rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    surahNumber: integer("surah_number").notNull(),
    ayahNumber: integer("ayah_number").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("uniq_user_ayah").on(t.userId, t.surahNumber, t.ayahNumber)]
);

export type AyahReward = typeof ayahRewardsTable.$inferSelect;
