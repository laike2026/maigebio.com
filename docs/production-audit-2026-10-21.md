# MAIGE production self-check — 2026-10-21

Scope: public pages on `maigebio.com`, the Chinese administration area, data integrations, mobile layout, search visibility, enquiry delivery, security and deployment. This is a point-in-time audit. Counts below are measured values; an empty report is not replaced with sample data.

## Public site

- Crawled all 72 URLs in the live sitemap across English, Arabic, Russian and Spanish. All returned HTTP 200 with one H1, a title, description, canonical URL, hreflang and image alternative text. The crawl found 80 unique internal destinations and no broken internal destination.
- Checked desktop, 390 px English mobile and 360 px Arabic RTL mobile views. The main navigation, mobile drawer and nested product menu opened and linked to the expected routes. The Arabic view exposed a 10,359 px horizontal scroll area caused by the off-screen form spam trap. The CSS now clips the trap in place.
- The `www` host previously served a second HTTP 200 copy of each page. A permanent host redirect now sends it to the canonical apex domain. HTTP already upgrades to HTTPS.
- The published `robots.txt` and sitemap are accessible. The 72 public pages are indexable and expose normal HTML metadata. Homepage pages include JSON-LD; other pages remain readable HTML. The admin layout emits `noindex, nofollow`. Search Console has real impressions, including an old removed sample blog URL. The removed sample article remains unavailable, as requested earlier.
- Brand icon, Apple icon and web manifest are present. WhatsApp uses a short visible label and the approved URL.
- The design follows the approved reference structure. Factory, office and product specification evidence remains pending; public copy does not assert unverified technical details. Original company photography, approved SKU tables and downloadable PDFs must be supplied before they can be represented as verified material.

## Administration and data

- Verified password login and opened the workbench, product and category management, news and news categories, media, leads and statuses, users, roles, audit, settings, sessions, account, analytics, SEO and sync pages. One observed navigation run loaded pages in approximately 0.8–1.7 s. These values are not field p95 measurements.
- The backend and database are connected. A controlled enquiry reached production storage and appeared in the leads list. It is the only enquiry recorded during the audit. It is explicitly labelled `MAIGE QA 2026-10-21`; the owner asked to retain it temporarily, so lead totals currently include one internal test entry.
- GA4 and Search Console synchronization completed without a source error. GA4 has no recorded visitor daily rows yet; Search Console had five stored metric rows through 2026-10-20. The frontend tracker waits for explicit analytics consent. No fabricated country, source or form event counts are shown.
- Analytics now requests GA4 default channel group and source/medium, displays sessions by channel and source, and keeps the core report available if that extra acquisition request fails. Existing country reporting remains. Per-form views, starts, field completion, submissions, address clicks and WhatsApp clicks remain based on actual accepted tracking events.
- Opening the admin area queues missing GA4/Search Console dates; the daily check supplies a roughly 72-hour fallback. Sitemap submission is weekly on Monday. There is no automatic news or blog publishing path; articles are manually drafted and published in the admin area.

## Enquiry delivery and limits

- The test enquiry was saved, but its email notification failed. Vercel request logs showed a `403` response from Resend. Resend shows the `maigebio.com` sender domain as **Not Started**; DNSPod currently lacks the displayed DKIM TXT and `send` subdomain MX/SPF records. The owner deferred DNS work. Email notifications and email-based password reset cannot be considered verified until the domain is validated and a live delivery test passes.
- The public form previously displayed a “sent to the team” message even for `saved_pending`. It now states in each language that the enquiry was saved while email notification is delayed. Lead preview and detail pages expose notification status and source information to staff.
- The business address and map URL remain absent, per the owner's earlier decision to provide them later. Address click tracking therefore has no public address link to count.
- The user-provided administrator password still works. A password change is advisable after handover; credential changes require the account owner to enter the new secret personally in the browser.

## Quality gates

- Next.js 16.3.8 documentation was consulted before editing.
- TypeScript, production build, translation completeness, 21 local HTTP route checks and dependency audit passed. `pnpm audit --audit-level high` reported no known vulnerabilities.
- A 308 `www` redirect was verified against the production build locally. The live site remains on the prior deployment until the commit is pushed and Vercel reports Ready.
- PageSpeed Insights returned an API rate-limit response during this audit. No Lighthouse or real-user Core Web Vitals score is claimed.

## Deployment verification to record

After Git push and Vercel Ready, verify the deployment commit, apex and `www` response, one route per locale, mobile RTL width, admin analytics source panel, enquiry pending copy, health endpoint, robots and sitemap. Keep the retained test lead and deferred DNS state visible in the handover.
