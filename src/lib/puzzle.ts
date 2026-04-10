import { eq, inArray } from "drizzle-orm";
import { dailyPuzzles, movies } from "@/db/schema";
import type { getDb } from "@/db";
import { getDailySecret } from "./env";
import { generateTenPairs, type PuzzlePair } from "./daily";
import { listEligibleMovies } from "./ingest";

type AppDb = ReturnType<typeof getDb>;
const POSTER_PLACEHOLDER_URL = "/images/poster-placeholder.svg";

export type PublicMovie = {
  imdbId: string;
  title: string;
  year: string | null;
  posterUrl: string;
};

export type PublicQuestion = { left: PublicMovie; right: PublicMovie };

function toPublic(row: typeof movies.$inferSelect): PublicMovie {
  return {
    imdbId: row.imdbId,
    title: row.title,
    year: row.year,
    posterUrl: POSTER_PLACEHOLDER_URL,
  };
}

export async function loadPuzzlePairs(db: AppDb, puzzleDate: string): Promise<PuzzlePair[] | null> {
  const existing = await db
    .select()
    .from(dailyPuzzles)
    .where(eq(dailyPuzzles.puzzleDate, puzzleDate))
    .limit(1);
  const row = existing[0];
  if (!row) return null;
  return JSON.parse(row.pairsJson) as PuzzlePair[];
}

export async function getOrCreatePuzzlePairs(db: AppDb, puzzleDate: string): Promise<PuzzlePair[]> {
  const cached = await loadPuzzlePairs(db, puzzleDate);
  if (cached) return cached;
  const secret = getDailySecret();
  const eligible = await listEligibleMovies(db);
  const pairs = generateTenPairs(eligible, secret, puzzleDate);
  try {
    await db.insert(dailyPuzzles).values({
      puzzleDate,
      pairsJson: JSON.stringify(pairs),
      createdAt: new Date(),
    });
  } catch {
    const again = await loadPuzzlePairs(db, puzzleDate);
    if (again) return again;
    throw new Error("Failed to persist daily puzzle");
  }
  return pairs;
}

export async function buildPublicDaily(db: AppDb, puzzleDate: string): Promise<{ date: string; questions: PublicQuestion[] }> {
  const pairs = await getOrCreatePuzzlePairs(db, puzzleDate);
  const ids = new Set<string>();
  for (const p of pairs) {
    ids.add(p.leftImdbId);
    ids.add(p.rightImdbId);
  }
  const idList = [...ids];
  const rows =
    idList.length === 0
      ? []
      : await db
          .select()
          .from(movies)
          .where(inArray(movies.imdbId, idList));
  const byId = new Map(rows.map((r) => [r.imdbId, r]));
  const questions: PublicQuestion[] = pairs.map((p) => {
    const left = byId.get(p.leftImdbId);
    const right = byId.get(p.rightImdbId);
    if (!left || !right) {
      throw new Error("Daily puzzle references missing movies; re-run warm-pool.");
    }
    return { left: toPublic(left), right: toPublic(right) };
  });
  return { date: puzzleDate, questions };
}

export async function gradeAnswer(
  db: AppDb,
  puzzleDate: string,
  questionIndex: number,
  chosenImdbId: string,
): Promise<{
  correct: boolean;
  higherImdbId: string;
  leftImdbId: string;
  rightImdbId: string;
  leftRating: number;
  rightRating: number;
}> {
  const pairs = await loadPuzzlePairs(db, puzzleDate);
  if (!pairs) {
    throw new Error("Puzzle not found for this date");
  }
  const pair = pairs[questionIndex];
  if (!pair) {
    throw new Error("Invalid questionIndex");
  }
  if (chosenImdbId !== pair.leftImdbId && chosenImdbId !== pair.rightImdbId) {
    throw new Error("chosenImdbId must match one of the two movies in this question");
  }
  const rows = await db
    .select()
    .from(movies)
    .where(inArray(movies.imdbId, [pair.leftImdbId, pair.rightImdbId]));
  const byId = new Map(rows.map((r) => [r.imdbId, r]));
  const a = byId.get(pair.leftImdbId);
  const b = byId.get(pair.rightImdbId);
  if (!a || !b) {
    throw new Error("Movies missing for this question");
  }
  const higherImdbId = a.imdbRating >= b.imdbRating ? a.imdbId : b.imdbId;
  const correct = chosenImdbId === higherImdbId;
  return {
    correct,
    higherImdbId,
    leftImdbId: pair.leftImdbId,
    rightImdbId: pair.rightImdbId,
    leftRating: a.imdbRating,
    rightRating: b.imdbRating,
  };
}
