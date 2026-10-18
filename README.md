# MAIGE Bio website and Chinese management backend

This repository contains the MAIGE multilingual B2B website (`/en`, `/ar`, `/ru`, `/es`) and a Chinese management backend at `/admin`. The target repository is [`laike2026/maigebio.com`](https://github.com/laike2026/maigebio.com).

## Architecture

- Next.js App Router, React and TypeScript serve the website, admin UI and API.
- PostgreSQL stores users, sessions, content, leads, tracking aggregates, SEO data, jobs and audit records. Local development uses **persistent PGlite** in `.data/postgres`; production requires `DATABASE_URL` for PostgreSQL.
- Media is kept in `.data/media` locally, in private Vercel Blob storage on Vercel, or in S3-compatible storage for Docker. Images are converted to WebP and thumbnails are generated.
- Vercel Cron calls `/api/cron` daily for maintenance and `/api/cron/data-sync` daily to check whether GA4/Search Console have gone 72 hours without a successful update. Opening the admin starts a missing-day catch-up. The Docker worker performs the same checks for self-hosted use. Its token is `CRON_SECRET`.
- GA4 reporting uses the server-side service account. Browser events only run after the visitor accepts analytics cookies. Address/WhatsApp clicks and the form funnel are shown separately from verified database enquiries.
- English is the default editorial language; products and articles have independent Arabic, Russian and Spanish versions. Incomplete translations fall back to English.

## Local development

Use Node.js 22+ and pnpm 11. The local database is created automatically, but migrations and the initial administrator must be prepared **before starting the server**:

```bash
pnpm install
pnpm db:migrate
ADMIN_USERNAME='admin' ADMIN_EMAIL='admin@example.com' ADMIN_NAME='MAIGE Admin' ADMIN_PASSWORD='a-unique-password-at-least-8-chars' pnpm db:create-admin
pnpm dev --port 3000
```

Visit `http://127.0.0.1:3000/en` and `http://127.0.0.1:3000/admin`. The initial administrator must change the password at first login. The local administrator for this review was created using an ignored, permission-restricted file under `.secrets`; no credential is committed. **Stop the local Next.js server before running `db:migrate`, `db:create-admin`, `db:backup` or `db:restore` against PGlite**. PGlite cannot be opened safely by two processes; scripts enforce this lock.

For local background jobs, set a `CRON_SECRET` of at least 24 random characters and run `pnpm worker` (or call the protected cron endpoints). The Vercel project uses the schedules in `vercel.json`: daily maintenance, a daily check that runs external data sync only when due, and Search Console sitemap submission every Monday at 09:00 Asia/Shanghai. The sitemap submission requires Search Console write scope and suitable property access.

## Docker development

Docker Compose includes PostgreSQL, MinIO, migration, app and worker services. Provide `POSTGRES_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` and `CRON_SECRET` in an untracked environment file, then run:

```bash
docker compose up --build -d
docker compose run --rm -e ADMIN_EMAIL=admin@example.com -e ADMIN_NAME='MAIGE Admin' -e ADMIN_PASSWORD='a-unique-password-at-least-8-chars' migrate pnpm db:create-admin
```

The site runs at `http://localhost:3000`, the MinIO console at `http://localhost:9001`. The `pgdata` and `miniodata` volumes preserve data across container recreation. Docker is not installed on the current development machine, so this Compose path is documented but not yet container-tested.

## Production deployment

The **laike2026** Vercel project `maigebio-com` is deployed at [maigebio.com](https://maigebio.com). Neon PostgreSQL and private Vercel Blob are connected only to Production. Migrations `001`–`014` and the initial `admin` account are in place. Server secrets are sensitive Production variables; see [.env.example](.env.example). The existing Resend integration is configured for enquiry notifications to `info@maigebio.com`.

`NEXT_PUBLIC_SITE_URL=https://maigebio.com`, `NEXT_PUBLIC_INDEXABLE=true`, and the SEO settings together control search indexing. The initial administrator must change the bootstrap password at first login before using protected content and media functions.

See [operations](docs/admin-operations.md) for migration, scheduler, backup/restore and rollout steps, and [API reference](docs/admin-api.md) for routes and permissions.

## Analytics and search

- GA4 browser measurement: `NEXT_PUBLIC_GA_MEASUREMENT_ID` (the current MAIGE stream is `G-MN1LN6LZ18`). Browser page views and events require visitor opt-in.
- GA4 server report: `GA4_PROPERTY_ID=558913614` plus `GOOGLE_SERVICE_ACCOUNT_JSON` (Vercel sensitive variable) or a local ignored `GOOGLE_APPLICATION_CREDENTIALS` file. Never put the service account JSON in `NEXT_PUBLIC_*` or Git.
- Search Console: the service account needs read access to `sc-domain:maigebio.com` and the Search Console API enabled. Recent dates can be provisional; the backend refreshes the latest three available days on later opens.
- Address tracking remains unconfigured until a verified business address/map URL is supplied. WhatsApp opens the short label while linking to the approved `wa.me` destination.
- Form field tracking stores only completion events. It never stores unfinished input values. Submitted enquiries are saved separately in PostgreSQL before email is attempted.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm test:admin
pnpm build
pnpm audit --audit-level moderate
```

`pnpm test:admin` creates an isolated PGlite database, migrates it, runs a local Next.js server, tests auth/RBAC, content, media, translations, relations, import queue, enquiries, analytics, SEO/sync and export, then removes the test data. `pnpm test:e2e` checks the public site while a local server is running. The local browser was also used to inspect the login, dashboard, editor and tracking charts.

If a local server is running on another port, set `TEST_BASE_URL`, for example `TEST_BASE_URL=http://127.0.0.1:3001 pnpm test:e2e`.

## Assets and verified content

- `public/images/brand/maige-logo.jpg` is the supplied official logo. `scripts/generate-brand-assets.mjs` derives the favicon, lockup and sharing images from it.
- Generic product illustrations and crops of the supplied homepage reference image are illustrative. They are not evidence of actual stock, facilities or specifications.
- Existing hard-coded product cards remain as fallback until approved company copy and source photography are provided. News and blog articles appear only after an editor saves a draft and explicitly publishes it in the backend.
- See [content gaps](docs/content-gaps.md) for outstanding verified business material.

## Known limits before production sign-off

Docker and S3 direct-upload paths cannot be exercised on this machine without those services. Import files above 4 MB require private Blob or S3 direct upload. The address map URL is intentionally blank pending verified address details. See [PLAN.md](PLAN.md) for current completion and remaining acceptance items.
