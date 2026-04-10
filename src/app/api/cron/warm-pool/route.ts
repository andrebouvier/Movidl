import { getDb } from "@/db";
import { cronGate } from "@/lib/cron-auth";
import { getOmdbApiKey } from "@/lib/env";
import { warmMoviePool } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = cronGate(request);
  if (denied) return denied;

  try {
    getOmdbApiKey();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Missing API key";
    return Response.json({ error: msg }, { status: 503 });
  }

  try {
    const db = getDb();
    const result = await warmMoviePool(db, 5);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Warm failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
