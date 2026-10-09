# Integrations, permissions & licensing checklist

Status legend: ✅ implemented & working without credentials · 🔌 implemented, needs credentials · ⛔ intentionally not implemented

| Area | Status | What you need to do |
|---|---|---|
| Accounts (e-mail/password, sessions, reset, delete) | ✅ | — |
| E-mail delivery (verification, password reset) | 🔌 | Create a [Resend](https://resend.com) account, verify a sending domain, set `RESEND_API_KEY` + `EMAIL_FROM`. Without it production shows "e-mail not configured" (no fake success). |
| Google sign-in | 🔌 | Google Cloud OAuth client (Web), redirect URI `/api/auth/google/callback`, set `GOOGLE_CLIENT_ID/SECRET`. |
| IGDB catalog | 🔌 | Register a Twitch application → `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`. Token is fetched and refreshed server-side (stored with expiry in `service_tokens`). |
| **IGDB commercial use** | ⚠️ | IGDB's API is free for non-commercial use. **Before any commercial launch (premium, ads), contact IGDB/Twitch for a commercial partnership** and follow their terms and attribution requirements. Attribution is shown on search results and game pages (`attribution.igdb`). |
| Cover / artwork images | ⚠️ | Served through `/api/cover` (same-origin proxy limited to `images.igdb.com`) for WebGL textures. Confirm image caching/proxying is allowed under your IGDB agreement. |
| Steam import | 🔌 | Steam Web API key (`STEAM_WEB_API_KEY`), comply with the [Steam Web API Terms](https://steamcommunity.com/dev/apiterms). Account linking uses Steam OpenID (no passwords). Private profiles are reported as "not visible", never as "no games". |
| Xbox / PlayStation library sync | ⛔ | No official public API was verified, so it is **not offered**. Manual and CSV entry are fully functional. |
| Platform achievements / trophies | ⛔ | "Verified" award category exists in the model but no definitions are granted without a verified integration. Owning a game never implies completion. |
| Payments / Premium | ⛔ (prepared) | Premium SKUs exist (`themes.premium_sku`, `asset_catalog.premium_sku`, `entitlements`). Only admins can grant entitlements today; nothing is charged. Add a payment provider (e.g. iyzico/Stripe) as a separate module that writes `entitlements` from a **verified webhook**. Export, deletion and security are never premium. |
| 3D models (consoles, figures, awards) | 🔌 | Supplied by you through `/admin/models`. Missing models show labelled abstract placeholders; no stock or fake console models are used. Make sure you hold the rights to every model you upload (many console likenesses are trademarked). |
| Platform trademarks | ⚠️ | The UI uses text names and neutral monograms, not official logos. Review naming with counsel before a commercial launch. |
| KVKK / GDPR | ⚠️ | Implemented: data export (JSON/CSV), account deletion with cascade, private-by-default sharing, prices/notes never shared. Still required from you: privacy notice & aydınlatma metni, data-processing agreements with Vercel/Neon/Resend, VERBİS assessment, cookie notice (only a session cookie and a locale cookie are set). |
| Global rate limiting / bot protection | ⚠️ | Per-instance limits exist. Configure Vercel Firewall (or Upstash) for production. |
