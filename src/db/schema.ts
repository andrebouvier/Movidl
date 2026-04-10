import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const movies = sqliteTable("movies", {
  imdbId: text("imdb_id").primaryKey(),
  title: text("title").notNull(),
  year: text("year"),
  imdbRating: real("imdb_rating").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const dailyPuzzles = sqliteTable("daily_puzzles", {
  puzzleDate: text("puzzle_date").primaryKey(),
  pairsJson: text("pairs_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type MovieRow = typeof movies.$inferSelect;
export type DailyPuzzleRow = typeof dailyPuzzles.$inferSelect;
