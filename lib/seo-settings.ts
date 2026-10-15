import "server-only";
import { query } from "@/lib/db";

export type SeoSettings = { indexingEnabled: boolean; sitemapEnabled: boolean; defaultTitle: string; defaultDescription: string; homeTitle: string; homeDescription: string; searchConsoleProperty: string };
export async function getSeoSettings(): Promise<SeoSettings> {
  const fallback: SeoSettings = { indexingEnabled: true, sitemapEnabled: true, defaultTitle: "MAIGE Bioscience", defaultDescription: "", homeTitle: "", homeDescription: "", searchConsoleProperty: "sc-domain:maigebio.com" };
  try {
    const rows = await query<{ value: Partial<SeoSettings> }>("SELECT value FROM system_settings WHERE key='seo'");
    return { ...fallback, ...(rows.rows[0]?.value || {}) };
  } catch { return fallback; }
}
