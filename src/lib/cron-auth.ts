import { getCronSecret } from "./env";

/** Returns a 401/503 Response when the caller is not allowed to run cron. */
export function cronGate(request: Request): Response | null {
  const secret = getCronSecret();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return Response.json(
        { error: "CRON_SECRET is not configured; refusing cron in production." },
        { status: 503 },
      );
    }
    return null;
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
