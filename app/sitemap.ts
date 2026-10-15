import type { MetadataRoute } from "next";
import { applications, articles, categories, locales } from "@/lib/site";
import { query } from "@/lib/db";
import { getSeoSettings } from "@/lib/seo-settings";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const settings = await getSeoSettings();
  if (!site || process.env.NEXT_PUBLIC_INDEXABLE !== "true" || !settings.indexingEnabled || !settings.sitemapEnabled) return [];
  let dynamicPaths: string[] = [];
  try {
    const [products, news, productCategories] = await Promise.all([
      query<{ slug: string }>("SELECT slug FROM products WHERE status='published' AND deleted_at IS NULL AND (published_at IS NULL OR published_at<=now()) LIMIT 5000"),
      query<{ slug: string }>("SELECT slug FROM news_articles WHERE status='published' AND deleted_at IS NULL AND (published_at IS NULL OR published_at<=now()) LIMIT 5000"),
      query<{ slug: string }>("SELECT slug FROM product_categories WHERE enabled=true AND deleted_at IS NULL LIMIT 1000"),
    ]);
    dynamicPaths = [...products.rows.map((item) => `/products/${item.slug}`), ...news.rows.map((item) => `/blog/${item.slug}`), ...productCategories.rows.map((item) => `/products/${item.slug}`)];
  } catch { /* The existing public routes remain indexable if the content database is temporarily unavailable. */ }
  const paths = [...new Set(["", "/products", ...categories.map((item) => `/products/${item.slug}`), "/applications", ...applications.map((item) => `/applications/${item.slug}`), "/about", "/manufacturing-quality", "/oem-odm", "/resources", "/blog", ...articles.map((item) => `/blog/${item.slug}`), "/faq", "/contact", "/privacy-policy", "/terms", ...dynamicPaths])];
  return locales.flatMap((locale) => paths.map((path) => ({ url: `${site}/${locale}${path}`, changeFrequency: "monthly" as const, priority: path === "" ? 1 : .6, alternates: { languages: Object.fromEntries(locales.map((item) => [item, `${site}/${item}${path}`])) } })));
}
