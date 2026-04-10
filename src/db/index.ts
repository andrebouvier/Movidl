import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let client: Database.Database | null = null;

function resolveSqlitePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/movidl.db";
  const raw = url.startsWith("file:") ? url.slice("file:".length) : url;
  const normalized = raw.replace(/^\/+/, "");
  return path.isAbsolute(normalized)
    ? normalized
    : path.join(process.cwd(), normalized);
}

export function getSqlitePath(): string {
  return resolveSqlitePath();
}

export function getDb() {
  if (client) {
    return drizzle(client, { schema });
  }
  const filePath = resolveSqlitePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  client = new Database(filePath);
  client.pragma("journal_mode = WAL");
  return drizzle(client, { schema });
}
