# MAIGE content follow-up

The website can publish category-level information and receive enquiries. The spreadsheet's “填写示例” column is example material, not an approved business fact. The following source material would improve the public site as it becomes available:

1. Exact English legal company name, registered address and approved company history. Until confirmed, public copy uses the MAIGE brand without claiming a legal entity or location.
2. Original logo artwork with transparent background. The current header uses a crop of the user-provided JPEG.
3. Original building, manufacturing, corridor and office photographs. The current visuals derive from the user-provided design reference and are presented as illustrative imagery.
4. Verified dialysis tubing and ELISA SKU records: catalog numbers, parameters, claims, product photos, protocols, safety restrictions and data sheets. The site currently describes product categories only.
5. Confirmation of any additional product lines, OEM/ODM capabilities, certifications, quality claims and case studies. No unsupported claims are published.
6. Approved catalog PDFs, technical data sheets and user guides. Current resources link to the enquiry form instead of promising a download that does not exist.
7. Legal review of the published English Privacy Policy and Terms of Use, including a precise company identity and retention schedule.

The production enquiry API uses the Production-only Resend integration and sends to `info@maigebio.com` once `maigebio.com` is verified as a sending domain. Local development saves to ignored `.data/inquiries.jsonl` and explicitly labels this as a local-only submission.

GA4 web measurement ID `G-MN1LN6LZ18` is configured for Production and loads only after visitor consent. The server-side service account remains a Production-only secret for a future reporting backend.
