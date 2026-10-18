# MAIGE backend API reference

All admin routes are under `/api/admin`, require an active HttpOnly admin session, and enforce permissions on the server. Mutating requests require a same-origin `Origin` header. Standard business errors return JSON with `code`, a Chinese `message`, `requestId` and optional `fields`. The public content API does not expose drafts or deleted records.

| Route | Method | Purpose | Permission |
| --- | --- | --- | --- |
| `/api/admin/auth/login` | POST | Login; lockout after repeated failures | Public |
| `/api/admin/auth/logout` | POST | Revoke current session | Logged in |
| `/api/admin/auth/change-password` | POST | Change password; invalidate old sessions | Logged in |
| `/api/admin/auth/forgot-password`, `/reset-password` | POST | Time-limited reset token and password reset | Public |
| `/api/admin/auth/sessions` | GET/DELETE | List and revoke sessions | Logged in |
| `/api/admin/:module` | GET/POST | Search, filter, paginate or create a record | `module:view/create` |
| `/api/admin/:module/:id` | GET/PATCH/DELETE/POST | Detail, update, soft-delete or restore | `module:view/update/delete` |
| `/api/admin/:module/:id/versions` | GET/POST | Version list and restore for products/news | `module:view/update` |
| `/api/admin/:module/:id/clone` | POST | Copy a product/news record as a draft | `module:create` |
| `/api/admin/products/:id/relations` | GET/PUT | Additional categories, gallery/files and related products | `products:view/update` |
| `/api/admin/news/:id/relations` | GET/PUT | Related products and articles | `news:view/update` |
| `/api/admin/translations/:module/:id` | GET/PUT | Product/news language variants | `module:view/update` |
| `/api/admin/lookups` | GET | Search reference records | Target view permission |
| `/api/admin/media/upload` | POST | Upload a file through the app | `media:create` |
| `/api/admin/media/sign`, `/complete` | POST | S3 direct upload handshake | `media:create` |
| `/api/admin/media/:id/usage` | GET | Preview metadata and usage positions | `media:view` |
| `/api/admin/import` | GET/POST | CSV template, preview, queue import ≤4 MB | `products/categories:create` |
| `/api/admin/import/sign`, `/complete` | POST | S3 direct upload and queue import ≤20 MB | `products/categories:create` |
| `/api/admin/import/jobs` | GET/POST | Progress and resumable batch processing | Owner or sync operator |
| `/api/admin/:module/export` | GET | Streaming CSV; lead export is audited | `module:export` |
| `/api/admin/export/jobs` | POST/GET | Queue a persistent CSV export; query progress | `module:export`, owner |
| `/api/admin/export/jobs/:id/download` | GET | Stream completed CSV chunks | `module:export`, owner |
| `/api/admin/leads/:id/notes` | GET/POST | Internal lead notes | `leads:view/update` |
| `/api/admin/analytics` | GET | Event funnel, actual leads and GA4 report | `analytics:view` |
| `/api/admin/seo` | GET | Search Console trends, pages, terms, countries, devices and issues | `seo:view` |
| `/api/admin/settings` | GET/PUT | Validated nonsecret settings | `settings:view/update` |
| `/api/admin/sync`, `/jobs`, `/run` | GET/POST | Source configuration, queue and manual run | `sync:view/sync` |

Public routes: `/api/public/products`, `/products/:slug`, `/categories`, `/categories/:slug`, `/news`, `/news/:slug`, `/news-categories`, and `/related-products/:slug`. Lists accept `locale`, `q`, `category`, `page` and `size` as applicable. `size` is capped at 100. All public content routes are read only and respond with `Cache-Control: no-store` so newly published content is visible immediately.

`POST /api/inquiry` validates and stores a submission before attempting notification. `POST /api/track` accepts an allowlisted event (`contact_address_click`, `contact_whatsapp_click`, `form_view`, `form_start`, `form_field_complete`, `form_submit_attempt`, `form_submit_success`, `form_submit_failure`) only with visitor consent. It records field names and completion events, never draft field values. `GET /api/cron`, `GET /api/cron/data-sync` and `GET /api/cron/google-sitemap` require `Authorization: Bearer <CRON_SECRET>`. `POST /api/admin/news/:id/publish` explicitly publishes a saved article draft. `GET /api/health` checks database availability.

Example admin content list: `GET /api/admin/products?q=dialysis&status=published&page=1&size=20`. Product and news writes use `expectedVersion` to reject conflicting changes. For query details and module fields, see `lib/admin/definitions.ts` and `lib/admin/records.ts`.
