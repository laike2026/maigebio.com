import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/lib/seo-settings";

export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const settings = await getSeoSettings();
  const indexable = Boolean(site && process.env.NEXT_PUBLIC_INDEXABLE === "true" && settings.indexingEnabled);
  return { rules: { userAgent: "*", allow: indexable ? "/" : undefined, disallow: indexable ? undefined : "/" }, sitemap: indexable && settings.sitemapEnabled ? `${site}/sitemap.xml` : undefined };
}
