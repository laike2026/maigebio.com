import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const indexable = Boolean(site && process.env.NEXT_PUBLIC_INDEXABLE === "true");
  return { rules: { userAgent: "*", allow: indexable ? "/" : undefined, disallow: indexable ? undefined : "/" }, sitemap: indexable ? `${site}/sitemap.xml` : undefined };
}
