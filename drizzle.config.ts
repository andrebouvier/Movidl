import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/movidl.db";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url },
});
