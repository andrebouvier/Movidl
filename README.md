# Critic

Daily web game: **10 questions** — pick which movie has the **higher IMDb rating** (via [OMDb](https://www.omdbapi.com/)). Posters use a local placeholder image. A **SQLite** cache stores movies and each day’s fixed puzzle so normal play does not hammer the API.

## Setup

1. **Node.js 20+** and npm.
2. Copy [`.env.example`](./.env.example) to `.env.local` and set:
   - `OMDB_API_KEY` — from omdbapi.com  
   - `DAILY_SECRET` — long random string (deterministic daily pairs)  
   - `CRON_SECRET` — optional locally; **required in production** for `/api/cron/warm-pool`  
   - `DATABASE_URL` — default `file:./data/critic.db` (creates `data/` automatically)
3. Install and create tables:

   ```bash
   npm install
   npm run db:push
   ```

4. **Fill the movie pool** (one-time or on a schedule). With no `CRON_SECRET` in development:

   ```bash
   curl http://localhost:3000/api/cron/warm-pool
   ```

   In production, set `CRON_SECRET` and call with:

   ```http
   GET /api/cron/warm-pool
   Authorization: Bearer <CRON_SECRET>
   ```

   [Vercel Cron](https://vercel.com/docs/cron-jobs) is declared in [`vercel.json`](./vercel.json) (daily 06:00 UTC). Configure the same `CRON_SECRET` in Vercel and add it to the cron request headers via your provider’s docs (or use an external scheduler that sends the header).

5. Run the app:

   ```bash
   npm run dev
   ```

   Open `/`. The daily puzzle uses the **UTC calendar date** (`?date=YYYY-MM-DD` for testing).

## Deploy notes

- **SQLite + Vercel serverless**: the filesystem is ephemeral — use **Turso**, **Neon Postgres**, or a **VPS** with a persistent disk if you deploy there. This repo targets **local SQLite** by default.
- **Environment**: all API keys and `DAILY_SECRET` stay **server-only** (`OMDB_API_KEY`, `DAILY_SECRET`, `CRON_SECRET`, `DATABASE_URL`).

## API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/daily?date=YYYY-MM-DD` | Public puzzle (no ratings). Creates today’s row if missing. |
| `POST` | `/api/daily/answer` | Body: `{ date, questionIndex (0–9), chosenImdbId }` — returns correctness and both ratings. |
| `GET` | `/api/cron/warm-pool` | Ingest a seeded IMDb movie list via OMDb and upsert ratings. Protected in production by `CRON_SECRET`. |
