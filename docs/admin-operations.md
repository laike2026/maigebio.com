# Backend operations and rollout

## Local and Docker

Run `pnpm db:migrate` before starting the local app. PGlite is persistent in `.data/postgres`. It must only be opened by one process; stop `pnpm dev` before migration, admin creation or backup. `MAIGE_DATA_DIR` selects an isolated data directory for tests or a second environment.

For Docker, set `POSTGRES_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` and a random `CRON_SECRET` of at least 24 characters in an untracked `.env`, then `docker compose up --build -d`. Compose runs the migrator before the app. Its worker calls the protected maintenance route hourly and checks the external data sync route daily. PostgreSQL, MinIO and backup data use named Docker volumes. This environment has not been container-tested on the present machine because Docker is unavailable.

## First administrator

Run `ADMIN_USERNAME=admin ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... pnpm db:create-admin` before starting PGlite. The password must have at least 7 characters. The first login forces a change to a new password of at least 7 characters. The script never prints the password. For PostgreSQL, set `DATABASE_URL_UNPOOLED` or `DATABASE_URL` to a direct connection before invoking the same command. Do not put bootstrap credentials in Git or long-lived Vercel variables.

## Vercel deployment and checks

1. The **laike2026** Vercel project `maigebio-com` uses Neon PostgreSQL and private Vercel Blob. Their credentials are scoped to sensitive Production variables. Do not connect the project to `shagaofeng-rgb`.
2. The Neon database received migrations `001` through `014` and the initial `admin` user. For future schema changes, back up the database first and apply pending SQL with `DATABASE_URL_UNPOOLED=... pnpm db:migrate`.
3. Add `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `IP_HASH_SALT`, `ANALYTICS_HASH_SALT`, GA4 service account variables, Resend variables, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_INDEXABLE`, and the GA4 measurement ID from `.env.example`. `GOOGLE_SERVICE_ACCOUNT_JSON` and Blob/Resend secrets must be Production-only and never use the `NEXT_PUBLIC_` prefix. S3 variables are an alternative for Docker or other hosts.
4. Verify the Resend sending domain and `info@maigebio.com` recipient. Give the service account viewer access to GA4 property `558913614`. Search Console requires separate site permission and API enablement; its source should be enabled only while those remain valid.
5. Verify `/api/health`, admin login, media upload, published content API, enquiry persistence/email, tracking consent, sitemap and rollback on Production. A Preview environment needs its own database branch and media store; it must never use Production credentials.
6. `vercel.json` schedules maintenance and site health at 02:00 UTC daily, external reporting at 01:00 UTC daily, and the Google sitemap submission on Mondays at 09:00 Asia/Shanghai. Authorized sync operators can catch up reporting days on admin entry. The daily cron also picks up failed sitemap submissions that are due for retry.
7. In `/admin/sync`, use **读取 Google 报告** to check the latest submission, the last Google download and the five inspected URLs before submitting again. An accepted submission records the Search Console API acknowledgement. Use the processing status and each URL's inspection result to check what Google did afterward.
8. Verify the production property, reporting coverage and mail delivery history with an authorized session. For a staged release, verify the exact commit and the existing domain assignment before promotion. Keep the previous working deployment available for rollback.

## Backup and recovery

- Manual: `BACKUP_DIR=/safe/path BACKUP_RETENTION_DAYS=30 pnpm db:backup`. With a direct PostgreSQL URL this executes `pg_dump --format=custom`; locally it creates a compressed PGlite data snapshot. The script removes its own backups older than the retention period only after a successful new backup.
- Docker: the `backup` service creates a custom PostgreSQL dump daily in the `backups` volume and keeps 30 days. Copy this volume to an off-host location for disaster recovery. Object storage must be versioned or copied separately; database dumps do not include object bytes.
- Restore remote: stop writes, point `DATABASE_URL_UNPOOLED` at the target database, set `RESTORE_CONFIRM=YES`, and run `pnpm db:restore /safe/path/maige-....dump`. Then run migrations and check `/api/health`, record counts, content and a media URL before reopening traffic.
- Restore local: set `RESTORE_TARGET` to a **new empty directory**, run `pnpm db:restore /safe/path/maige-....tar.gz`, inspect its migration count and test with `MAIGE_DATA_DIR` pointing to its parent. The restore script refuses to overwrite the active local database.

## Operations checks

- Release gates include `pnpm typecheck`, `pnpm test`, `pnpm test:admin`, `pnpm build` and `pnpm audit --prod`. The admin tests use an isolated database and exercise concurrent inquiry retries, permissions, upload validation, translated URLs and sitemap rules.
- `/admin/sync` shows source enablement, last success/error, future run time and job history. GA4, Search Console and Resend failures are recorded without deleting leads or existing report data.
- `/admin/analytics` separates consented events from actual submitted enquiries. Address tracking appears only after a verified HTTPS map URL is configured in Settings.
- After consent, GA4 receives `web_vital_lcp`, `web_vital_inp` and `web_vital_cls` events for the landing path. LCP and INP values use milliseconds. Divide CLS values by 1,000. Use sufficient samples per device and region before comparing percentiles.
- **站点巡检** in `/admin/sync` shows checks for public routes, reporting, Google sitemap processing, mail and the queue. Failed checks appear in the panel and log `MAIGE site health alert` with the affected check names. Mail acceptance and delivery are separate. Read-back of delivery requires a Resend credential with access to the sent record.
- Backend date displays and new tracking day buckets use the timezone in Settings. Historical day buckets are not rewritten after a timezone change; select the intended timezone before collecting production traffic.
- Export jobs store CSV chunks in PostgreSQL so worker restarts do not lose a large download. Daily retention cleanup removes completed export jobs and their chunks after 30 days; lead export downloads are audited.
- Retention cleanup uses the settings for analytics events, login attempts and audit logs. It does not automatically delete customer enquiries. Handle an authorised privacy request through a reviewed export/delete procedure for the specific lead.
- The private Blob store supports browser `PUT` to short-lived presigned URLs; `/api/media/:id` serves approved assets. The included MinIO CORS file configures the alternative Docker S3 path.
