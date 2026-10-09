# GAME MUSEUM

> *Every game you own deserves a place.*

A real-time 3D museum for your Xbox, PlayStation and PC game collection. Games come from the IGDB catalog, every owned copy is a database record, shelves are organised by console generation, layouts persist across devices, and collection awards are earned by real conditions and displayed as 3D trophies in a glass showcase.

| | |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Radix primitives · TanStack Query · Zustand · React Hook Form + Zod · next-intl (TR/EN) |
| 3D | three.js · React Three Fiber · drei (CameraControls, Environment/Lightformers, MeshReflectorMaterial, PerformanceMonitor) |
| Data | **Vercel Postgres (Neon via Vercel Marketplace)** + Drizzle ORM · embedded **PGlite** (real Postgres in WASM) when `DATABASE_URL` is empty |
| Files | **Vercel Blob** for 3D models (direct client uploads) · `/public/uploads` fallback in development only |
| Auth | Database sessions (httpOnly cookie, sha256-hashed tokens) · e-mail/password (bcrypt) · Google OAuth (Arctic, optional) · e-mail verification & password reset (Resend, optional) |
| Catalog | IGDB through a server-side adapter (token refresh, throttling, 429 back-off, cache) · clearly labelled **Demo Catalog** when not configured |
| Tests | Vitest (unit + PGlite integration) · Playwright E2E (desktop + mobile) |

> **Why Vercel Postgres instead of Firebase?** You asked for Vercel as the database. The data model from the brief (catalog vs owned copy, placements, awards, themes, jobs, events) maps naturally to relational tables with unique indexes and transactions, which is exactly what idempotent awards, optimistic shelf versions and cascade deletes need. Security rules are enforced in server code on every route (there is no client-side database access).

## Quick start (no credentials needed)

```bash
npm install
npm run dev          # http://localhost:3000
```

Without any environment variables the app:
- stores data in `./.data/pglite` (embedded Postgres, migrations + reference data applied automatically),
- shows the **Demo Museum** to signed-out visitors (fictional titles, labelled everywhere),
- uses the **Demo Catalog** for search (labelled; never mixed with real accounts),
- prints verification / reset links to the server log instead of sending e-mail,
- stores uploaded 3D models in `./public/uploads`.

Create an account → onboarding → add three games → your museum. To get admin access set `ADMIN_EMAILS=you@example.com` before registering (or update `users.role` in the database).

## Scripts

| Command | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit + integration (in-memory PGlite) |
| `npm run test:e2e` | Playwright against `next start` (run `npm run build` first; set `PW_CHROMIUM_PATH` if needed) |
| `npm run db:generate` | Generate SQL migrations from `src/lib/db/schema.ts` |
| `npm run db:migrate` / `db:seed` | Apply migrations / reference data to `DATABASE_URL` |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — structure, data model, flows, security, performance, phase report
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Vercel deployment guide
- [docs/CHECKLIST.md](docs/CHECKLIST.md) — missing APIs, permissions and licensing checklist
- [docs/3D-MODELS.md](docs/3D-MODELS.md) — technical format & placement guide for your console/figure/award models

## Attribution

Game data and images are provided by [IGDB.com](https://www.igdb.com). Platform names are trademarks of their owners; the app uses neutral monograms, not platform logos.
