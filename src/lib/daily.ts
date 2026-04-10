import type { MovieRow } from "@/db/schema";
import { seededShuffle } from "./seeded";

export type PuzzlePair = { leftImdbId: string; rightImdbId: string };

const DEFAULT_MIN_GAP = 0.1;

export function generateTenPairs(
  eligible: Pick<MovieRow, "imdbId" | "imdbRating">[],
  secret: string,
  puzzleDate: string,
  minGap = DEFAULT_MIN_GAP,
): PuzzlePair[] {
  const sorted = [...eligible].sort((a, b) => a.imdbId.localeCompare(b.imdbId));
  if (sorted.length < 20) {
    throw new Error(
      `Need at least 20 eligible movies in the pool (have ${sorted.length}). Call GET /api/cron/warm-pool to ingest titles.`,
    );
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    const salt = attempt === 0 ? "pairs" : `pairs:${attempt}`;
    const shuffled = seededShuffle(sorted, secret, puzzleDate, salt);
    const picked = shuffled.slice(0, 20);
    const pairs: PuzzlePair[] = [];
    let ok = true;
    for (let i = 0; i < 20; i += 2) {
      const a = picked[i]!;
      const b = picked[i + 1]!;
      if (Math.abs(a.imdbRating - b.imdbRating) < minGap) {
        ok = false;
        break;
      }
      pairs.push({ leftImdbId: a.imdbId, rightImdbId: b.imdbId });
    }
    if (ok && pairs.length === 10) return pairs;
  }
  throw new Error(
    "Could not form 10 fair pairs from the current pool. Ingest more movies or adjust min rating gap.",
  );
}
