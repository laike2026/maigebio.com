# MAIGE Global B2B Website — Local Preview

This Next.js site recreates the supplied MAIGE homepage composition and provides four localized site trees (`/en`, `/ar`, `/ru`, `/es`). The code is stored in the `laike2026/maigebio.com` GitHub repository. The linked Vercel project is paused and returns HTTP 503; public launch remains blocked pending the items in `docs/content-gaps.md`.

## Run locally

With Node.js 20.9+ and pnpm installed:

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000/en`. Other languages are `/ar`, `/ru`, and `/es`.

Check the project with `pnpm typecheck`, `pnpm build`, and, while the server is running, `pnpm test:e2e`.

## Current behavior

- Product search filters the two confirmed product directions. Product group pages contain enquiry fields and parameter checklists. Individual SKUs are withheld until real specifications are supplied.
- Enquiries are validated server side and appended to `.data/inquiries.jsonl` on this computer. The folder is Git ignored. **No email is sent yet.** Production requires a verified business inbox, a managed database, mail service, anti-abuse service, and privacy review.
- The short “Contact on WhatsApp” label in the top bar and the floating “WhatsApp” button both open the supplied `wa.me/qr/HLNDA5AQMXHME1` link.
- Google Analytics 4 uses the `NEXT_PUBLIC_GA_MEASUREMENT_ID` environment variable. The tag loads only after a visitor allows analytics; it sends page views without URL query strings and a `generate_lead` event after a successful enquiry. The consent choice can be changed through the on-page Analytics settings control. The MAIGE GA4 web stream's measurement ID is `G-MN1LN6LZ18`; Vercel stores it as a production Config variable.
- A separate Google service account is prepared for a future server-side GA4 reporting dashboard. Locally, `GOOGLE_APPLICATION_CREDENTIALS=.secrets/ga4-service-account.json` and `GA4_PROPERTY_ID=558913614` live in the ignored `.env.development.local`. The key file is excluded from Git. The service account has Viewer access to the MAIGE GA4 property, and the Google Analytics Data API is enabled in Google Cloud project `formal-outpost-511601-m4`. A read-only `runReport` request succeeded (HTTP 200; no website traffic has been collected yet). In the `laike2026` Vercel project, the same credential is stored as the production-only `GOOGLE_SERVICE_ACCOUNT_JSON` **Secret**, and `GA4_PROPERTY_ID` is a production Config variable. Future backend code should parse `GOOGLE_SERVICE_ACCOUNT_JSON` on Vercel or use Application Default Credentials from `GOOGLE_APPLICATION_CREDENTIALS` locally. Never expose either credential in `NEXT_PUBLIC_*` or send it to a browser.
- `robots.txt` disallows all crawlers until a verified domain and `NEXT_PUBLIC_INDEXABLE=true` are configured. Do not set that flag before content and legal review.

## Assets and evidence

- `public/images/brand/maige-logo.jpg` is the user-provided brand image.
- `public/images/products/*-illustration.png` are generic, AI-generated scientific illustrations. They are not specific MAIGE product photographs.
- `public/images/reference/home-reference.png` is the user-provided design screenshot. Its facility/hero image crops are **preview-only** and must be replaced with original, verified company photography before public launch.

See `docs/content-gaps.md` before publishing. The source spreadsheet has business goals filled in, but many company, product and contact fields contain examples rather than verified values.
