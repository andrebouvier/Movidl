import { createHmac } from "crypto";

/** Deterministic shuffle for a given date + salt (LCG seeded from HMAC). */
export function seededShuffle<T>(items: readonly T[], secret: string, puzzleDate: string, salt: string): T[] {
  const arr = [...items];
  const digest = createHmac("sha256", secret).update(puzzleDate).update(":").update(salt).digest();
  let seed = digest.readUInt32BE(0) || 1;
  function rand() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}
