import { getDb } from "@/db";
import { getDailySecret } from "@/lib/env";
import { gradeAnswer } from "@/lib/puzzle";

export const dynamic = "force-dynamic";

type Body = {
  date?: string;
  questionIndex?: number;
  chosenImdbId?: string;
};

export async function POST(request: Request) {
  try {
    getDailySecret();
  } catch {
    return Response.json({ error: "Server misconfigured: DAILY_SECRET" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date : "";
  const questionIndex = body.questionIndex;
  const chosenImdbId = typeof body.chosenImdbId === "string" ? body.chosenImdbId : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  if (typeof questionIndex !== "number" || !Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex > 9) {
    return Response.json({ error: "questionIndex must be 0–9" }, { status: 400 });
  }
  if (!chosenImdbId.startsWith("tt")) {
    return Response.json({ error: "Invalid chosenImdbId" }, { status: 400 });
  }

  try {
    const db = getDb();
    const result = await gradeAnswer(db, date, questionIndex, chosenImdbId);
    return Response.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
