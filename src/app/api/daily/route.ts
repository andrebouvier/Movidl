import { getDb } from "@/db";
import { parseOptionalDateParam, utcDateString } from "@/lib/dates";
import { getDailySecret } from "@/lib/env";
import { buildPublicDaily } from "@/lib/puzzle";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    getDailySecret();
  } catch {
    return Response.json({ error: "Server misconfigured: DAILY_SECRET" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const date = parseOptionalDateParam(searchParams.get("date")) ?? utcDateString();

  try {
    const db = getDb();
    const payload = await buildPublicDaily(db, date);
    return Response.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const isPool = message.includes("warm-pool") || message.includes("eligible movies");
    return Response.json({ error: message }, { status: isPool ? 503 : 400 });
  }
}
