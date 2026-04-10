import { movies } from "@/db/schema";
import type { getDb } from "@/db";
import { getOmdbApiKey } from "./env";
import { IMDB_SEED_IDS } from "./imdb-seed";
import { omdbByImdbId, parseImdbRating } from "./omdb";

type AppDb = ReturnType<typeof getDb>;

export async function upsertMovieFromImdbId(db: AppDb, imdbId: string): Promise<string | null> {
  const omdbKey = getOmdbApiKey();
  const omdb = await omdbByImdbId(omdbKey, imdbId);
  if (omdb.Response === "False") return null;
  const rating = parseImdbRating(omdb.imdbRating);
  if (rating === null) return null;
  const cleanImdbId = omdb.imdbID?.trim();
  if (!cleanImdbId) return null;

  const title = omdb.Title?.trim();
  if (!title) return null;
  const yearRaw = omdb.Year;
  const year = yearRaw && yearRaw !== "N/A" ? yearRaw : null;
  const now = new Date();

  await db
    .insert(movies)
    .values({
      imdbId: cleanImdbId,
      title,
      year,
      imdbRating: rating,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: movies.imdbId,
      set: {
        title,
        year,
        imdbRating: rating,
        updatedAt: now,
      },
    });

  return cleanImdbId;
}

export type WarmPoolResult = { attempted: number; insertedOrUpdated: number; errors: number };

export async function warmMoviePool(db: AppDb, maxPagesPerList = 5): Promise<WarmPoolResult> {
  const ids = IMDB_SEED_IDS.slice(0, Math.max(1, maxPagesPerList) * 50);
  let insertedOrUpdated = 0;
  let errors = 0;
  for (const id of ids) {
    try {
      const imdb = await upsertMovieFromImdbId(db, id);
      if (imdb) insertedOrUpdated += 1;
    } catch {
      errors += 1;
    }
  }
  return { attempted: ids.length, insertedOrUpdated, errors };
}

export async function countEligibleMovies(db: AppDb): Promise<number> {
  const all = await db.select().from(movies);
  return all.filter((m) => Number.isFinite(m.imdbRating)).length;
}

export async function listEligibleMovies(db: AppDb) {
  const all = await db.select().from(movies);
  return all.filter((m) => Number.isFinite(m.imdbRating));
}
