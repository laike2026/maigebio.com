import "server-only";
import { GoogleAuth } from "google-auth-library";
import { query } from "@/lib/db";
import { getSeoSettings } from "@/lib/seo-settings";
import { checkGoogleSearch, type GoogleSearchReceipt } from "@/lib/google-search-check";

export type { GoogleSearchReceipt } from "@/lib/google-search-check";
const key = "google_search_receipt";

export async function getGoogleSearchReceipt() {
  const result = await query<{ value: GoogleSearchReceipt }>("SELECT value FROM system_settings WHERE key=$1", [key]);
  return result.rows[0]?.value ?? null;
}

export async function verifyGoogleSearch(submit = false) {
  const [settings, stored] = await Promise.all([getSeoSettings(), getGoogleSearchReceipt()]);
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || !/^https:\/\//.test(site)) throw new Error("SITEMAP_SITE_NOT_CONFIGURED");
  if (submit && (!settings.indexingEnabled || !settings.sitemapEnabled || process.env.NEXT_PUBLIC_INDEXABLE !== "true")) {
    throw new Error("SITEMAP_DISABLED");
  }
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : undefined;
  if (!credentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error("SEARCH_CONSOLE_NOT_CONFIGURED");
  const auth = new GoogleAuth({
    credentials,
    keyFilename: credentials ? undefined : process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: [submit ? "https://www.googleapis.com/auth/webmasters" : "https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("SEARCH_CONSOLE_TOKEN_UNAVAILABLE");
  const property = settings.searchConsoleProperty;
  const sitemapUrl = new URL("/sitemap.xml", site).toString();
  const previous = stored?.property === property && stored.sitemapUrl === sitemapUrl ? stored : null;
  const receipt = await checkGoogleSearch({ property, sitemapUrl, token: token.token, previous, submit });
  await query(`INSERT INTO system_settings(key,value) VALUES($1,$2)
    ON CONFLICT(key) DO UPDATE SET value=CASE
      WHEN system_settings.value->>'property'=excluded.value->>'property' AND system_settings.value->>'sitemapUrl'=excluded.value->>'sitemapUrl'
      THEN excluded.value || jsonb_strip_nulls(jsonb_build_object('acceptedAt', GREATEST(system_settings.value->>'acceptedAt', excluded.value->>'acceptedAt')))
      ELSE excluded.value END,updated_at=now()`, [key, JSON.stringify(receipt)]);
  return receipt;
}
