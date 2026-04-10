-- Initial schema for Movidl (SQLite). Prefer `npm run db:push` from Drizzle; this file is a reference.

CREATE TABLE `movies` (
  `imdb_id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `year` text,
  `imdb_rating` real NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE `daily_puzzles` (
  `puzzle_date` text PRIMARY KEY NOT NULL,
  `pairs_json` text NOT NULL,
  `created_at` integer NOT NULL
);
