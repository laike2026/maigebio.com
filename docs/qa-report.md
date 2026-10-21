# Local preview QA

> Historical local-preview record from 2026-10-13. Current production findings are in [the 2026-10-21 audit](production-audit-2026-10-21.md).

Date: 2026-10-13 (Asia/Shanghai)

## Passed

- Next.js optimized production build and TypeScript checks.
- Four localized home URLs, product groups, application routes, About, quality, OEM/ODM, resources, blog, FAQ, contact and legal draft pages.
- 21 HTTP smoke checks: route 200s, H1 presence, WhatsApp link, Arabic `lang`/`dir`, search no-result state, invalid product 404, and local `robots.txt` disallow.
- Translation key completeness across English, Arabic, Russian and Spanish.
- 1440px desktop and 390px mobile visual inspection; Arabic 390px RTL inspection.
- Browser form submission and direct API submission returned success and created local records. Synthetic QA records were removed after verification.
- The top contact link and floating button point to the user-provided WhatsApp QR URL while showing short labels.

## Pending evidence / limitations

- No original factory or office images, approved product photos, verified SKU tables, PDF downloads, business email or legal entity details were supplied in the current materials.
- Facility images are crops of the supplied design screenshot for **local reference only**. Generic product images are AI-created illustrations, not documented product photography.
- The enquiry system stores locally and has no email delivery or production database yet. Do not publish it in this state.
- No Lighthouse scores or real-user Core Web Vitals are claimed. Those require a production-like URL and further testing.
- Code was pushed to `laike2026/maigebio.com` on 2026-10-14. External domain, Vercel project, Search Console and Bing setup remain pending.
