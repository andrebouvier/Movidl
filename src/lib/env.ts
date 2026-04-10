function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

export function getOmdbApiKey(): string {
  return requireEnv("OMDB_API_KEY");
}

export function getDailySecret(): string {
  return requireEnv("DAILY_SECRET");
}

export function getCronSecret(): string | undefined {
  const v = process.env.CRON_SECRET?.trim();
  return v || undefined;
}
