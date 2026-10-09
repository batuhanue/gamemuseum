# Architecture

## Layout
```
src/
  app/                 routes (pages + /api route handlers)
  components/
    museum/            MuseumExperience (persistent canvas), panels, 2D fallback
    museum/scene/      R3F scene: Architecture, Lighting, Gallery (shelves), GameCase, AwardShowcase, Trophy, ModelAsset, CameraRig
    collection/ games/ profile/ settings/ admin/ auth/ onboarding/ shell/ ui/
  features/            pure domain logic shared by server & client (layout sorting, award conditions, platforms, case profiles, themes, demo catalog, anchors)
  services/            server-only use cases (collection, shelves, awards, museum snapshot, catalog, imports, profile/privacy, admin)
  lib/                 db (Drizzle schema/client/seed), auth, igdb, steam, storage, http helpers, validation
  stores/              Zustand: transient 3D/UI state, unlock queue, toasts
  i18n/  messages/     next-intl (TR default, EN); messages generated from scripts/messages.py
drizzle/               SQL migrations
tests/unit · tests/integration · tests/e2e
```

## Data model (Postgres)
`users, sessions, oauth_accounts, auth_tokens, linked_accounts, entitlements, platforms, generations, catalog_games, catalog_search_cache, service_tokens, user_games, museum_shelves, museum_placements, asset_catalog, asset_versions, museum_objects, award_definitions, user_awards, themes, collection_goals, import_jobs, activity_events, admin_audit_log, error_log`.

- **Catalog vs ownership:** `catalog_games` holds metadata (IGDB / demo / user-manual). `user_games` is one row per owned copy (platform, generation, physical/digital, store, edition, region, condition, purchase info, status…). The same game on PS2 physical, X360 digital and Steam is three rows.
- **Placements:** one `museum_placements` row per copy (`sortIndex` + derived `shelfIndex/slotIndex` from generation capacity, rotation/scale/display mode). `museum_shelves` stores per-generation mode (auto/manual), sort rule and an **optimistic-lock version**.
- **Awards:** `award_definitions` (versioned rules) and `user_awards` (unique `(user, award)`, stores the rule version it was earned under).
- Platform families/generations are data, so Nintendo/Sega/… can be added from `/admin`.

## Key flows
- **Add game:** search (debounced, server proxy) → pick → platform (only generations the catalog lists; PC → store) → ownership → details → transaction inserts the copy and re-lays out the shelf → awards evaluated → client invalidates the museum snapshot; "See on shelf" opens `/museum/<platform>?highlight=<copy>` which focuses camera, page and case.
- **Shelf layout:** auto mode sorts by rule (alphabetical, release, added, generation, status, favourites, series, ownership); manual mode keeps the saved order and appends new copies. Drag-and-drop in 3D (or up/down buttons in the accessible list) updates a local order immediately, saves after 700 ms, buffers unsent changes in an outbox (`localStorage`, retried on `online`) and sends `expectedVersion` — a stale version returns **409** and the client reloads the server state instead of overwriting.
- **Awards:** evaluated only on the server after each mutation (`evaluateAwards`): metrics via SQL → pure condition functions → `INSERT … ON CONFLICT DO NOTHING` (idempotent, safe under concurrency). Earned awards are permanent; counts/progress are recomputed live. Progress percentages always use explicit denominators (award targets, personal goals) — never the whole catalog.
- **Sharing:** `private` (default) → 404; `unlisted` → needs the share key (timing-safe compare, rotatable); `public`. Public snapshots exclude hidden copies, prices, notes, e-mail, goals and progress.

## Security
- Every API route uses `route()` (same-origin check for mutations, uniform errors, Zod validation) and `requireUser/requireAdmin`; every query is scoped by `userId`. Admin checks are server-side; UI hiding is cosmetic.
- Sessions: random 32-byte token in an httpOnly SameSite=Lax cookie; only its SHA-256 is stored. Passwords: bcrypt. Reset/verify tokens are single-use, hashed, expiring.
- Uploads: admin-only, type/size checked, GLB header verified server-side, URLs restricted to the project Blob store or same-origin paths.
- CSV export neutralises formula injection. Security headers set in `next.config.ts`.

## 3D & performance
- One persistent `<Canvas frameloop="demand">` in the museum layout: route changes animate the camera (CameraControls with room boundary, polar limits, reduced-motion aware) instead of reloading.
- Hall view shows a two-row preview per generation column; focusing a generation expands it into a full three-row bay with pagination (`capacity × 3` per page) so large libraries never render everything at once.
- Shared geometries/materials, texture cache with LRU eviction and limited parallel cover loading, procedural typographic covers when no art exists, fixed light budget (no shader recompiles), local Lightformer environment (no HDR downloads), reflective floor only on high quality, `PerformanceMonitor` + `AdaptiveDpr` + DPR caps per device class.
- WebGL missing / context lost / scene crash → 2D collection view with explanation and retry; a manual "2D view" toggle is always available.

## Phase report
| Phase | Delivered |
|---|---|
| 1 Foundation | Next.js + TS strict, design tokens, Postgres/PGlite + Drizzle migrations, auth (sessions, Google, verify/reset, delete), i18n TR/EN, navigation, demo catalog |
| 2 3D core | Hall architecture, lighting, camera rig, three galleries, generation shelves, procedural cases per generation, console model slots with placeholders, desktop & mobile scene modes |
| 3 Catalog & ownership | IGDB adapter + cache + rate handling, search UI, add/edit/remove copies, physical/digital, PC stores, persistent auto/manual layouts, CSV & Steam import |
| 4 Rewards & customisation | 25 award definitions, server evaluator, unlock animation, 3D showcase, themes with real material/light params, anchor-based object placement |
| 5 Profile & sharing | Profile & stats, private/unlisted/public museum, share settings, export |
| 6 Hardening | Optimistic concurrency, offline outbox, error log, audit log, admin panel, unit/integration/E2E tests, deployment docs |

Known limits: performance targets are not yet measured on real devices; Steam matching requires IGDB; IGDB `external_games.category` is used for Steam ids (IGDB has been migrating this field — verify with live credentials).
