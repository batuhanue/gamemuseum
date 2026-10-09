# Deploying to Vercel

## 1. Create the project
1. Import the GitHub repository in Vercel (framework preset: **Next.js**).
2. Build command: **`npm run vercel-build`** (runs migrations and reference-data seeding, then `next build`). If you keep the default `next build`, migrations are still applied automatically on the first database connection (under a Postgres advisory lock).
3. Node.js 20.9+ (22 recommended).

## 2. Database — Vercel Postgres (Neon)
1. Vercel dashboard → **Storage → Create → Neon (Postgres)** and connect it to the project (Production + Preview).
2. Vercel injects `DATABASE_URL` (also accepted: `POSTGRES_URL`). Nothing else is required. **Redeploy after connecting the database** — environment variables only apply to new deployments.
3. On each deploy `npm run db:migrate` applies `drizzle/*.sql` and `npm run db:seed` inserts platforms, generations, themes, award definitions and the demo catalog (idempotent; admin edits are never overwritten).
4. Optional: `DATABASE_POOL_MAX` (default 5).

> Preview deployments share the database unless you enable Neon's *branch per preview*; recommended.

## 3. File storage — Vercel Blob
1. **Storage → Create → Blob**, connect to the project → `BLOB_READ_WRITE_TOKEN` is injected.
2. Admin uploads go directly from the browser to Blob using short-lived tokens issued by `/api/admin/assets/upload` (admin-only, GLB/glTF/images, 50 MB cap); the server re-checks the file header before registering it.

## 4. Environment variables
See `.env.example`. Required in production:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | from the Neon integration |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://museum.example.com` (OAuth/Steam/OpenID return URLs, share links) |
| `APP_ENV` | `production` |
| `SESSION_SECRET` | 32+ random characters |
| `BLOB_READ_WRITE_TOKEN` | from the Blob integration (needed for model uploads) |

Optional integrations: `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET` (catalog) · `STEAM_WEB_API_KEY` (Steam import) · `GOOGLE_CLIENT_ID/SECRET` (redirect URI `https://<domain>/api/auth/google/callback`) · `RESEND_API_KEY`, `EMAIL_FROM` (verification/reset mail) · `ADMIN_EMAILS`.

Secrets (`IGDB_CLIENT_SECRET`, `STEAM_WEB_API_KEY`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`) are only read in server code and never prefixed with `NEXT_PUBLIC_`.

## 5. After the first deploy
1. Register with an address listed in `ADMIN_EMAILS` → you are admin.
2. `/admin/models` → upload your console / figure / award GLBs (see `docs/3D-MODELS.md`), map them to generations, set **ready**.
3. Optionally configure IGDB; until then search shows the labelled Demo Catalog.

## 6. Function limits
- Steam sync can take long for big libraries: `/api/steam/sync` sets `maxDuration = 300` (needs Pro plan; on Hobby, very large libraries may need several syncs — re-syncs are idempotent).
- CSV import runs in 25-row batches from the browser so each request stays short.
- The per-instance rate limiter is a burst brake; for strict global limits add Vercel Firewall rules or an Upstash limiter.
