import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/lib/seo-settings";

export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const settings = await getSeoSettings();
  const publicSite = Boolean(site && process.env.NEXT_PUBLIC_INDEXABLE === "true");
  return {
    rules: { userAgent: "*", allow: publicSite ? "/" : undefined, disallow: publicSite ? undefined : "/" },
    sitemap: publicSite && settings.indexingEnabled && settings.sitemapEnabled ? `${site}/sitemap.xml` : undefined,
  };
}
