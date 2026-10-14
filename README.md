# MAIGE Global B2B Website — Local Preview

This Next.js site recreates the supplied MAIGE homepage composition and provides four localized site trees (`/en`, `/ar`, `/ru`, `/es`). The code is stored in the `laike2026/maigebio.com` GitHub repository for review. The website has **not been deployed** and remains blocked from indexing.

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
- `robots.txt` disallows all crawlers until a verified domain and `NEXT_PUBLIC_INDEXABLE=true` are configured. Do not set that flag before content and legal review.

## Assets and evidence

- `public/images/brand/maige-logo.jpg` is the user-provided brand image.
- `public/images/products/*-illustration.png` are generic, AI-generated scientific illustrations. They are not specific MAIGE product photographs.
- `public/images/reference/home-reference.png` is the user-provided design screenshot. Its facility/hero image crops are **preview-only** and must be replaced with original, verified company photography before public launch.

See `docs/content-gaps.md` before publishing. The source spreadsheet has business goals filled in, but many company, product and contact fields contain examples rather than verified values.
