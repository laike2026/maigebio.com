import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { query } from "@/lib/db";

export type SeoSettings = { indexingEnabled: boolean; sitemapEnabled: boolean; defaultTitle: string; defaultDescription: string; homeTitle: string; homeDescription: string; searchConsoleProperty: string };
export const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  await connection();
  const fallback: SeoSettings = { indexingEnabled: true, sitemapEnabled: true, defaultTitle: "MAIGE Bioscience", defaultDescription: "", homeTitle: "", homeDescription: "", searchConsoleProperty: "sc-domain:maigebio.com" };
  try {
    const rows = await query<{ value: Partial<SeoSettings> }>("SELECT value FROM system_settings WHERE key='seo'");
    return { ...fallback, ...(rows.rows[0]?.value || {}) };
  } catch { return fallback; }
});
