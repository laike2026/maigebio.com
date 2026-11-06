import type { MetadataRoute } from "next";
import { applications, categories, href, locales, type Locale } from "@/lib/site";
import { query } from "@/lib/db";
import { getSeoSettings } from "@/lib/seo-settings";
import { categoryPaths, publishedIndex, publishedPaths } from "@/lib/content-index";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const settings = await getSeoSettings();
  if (!site || process.env.NEXT_PUBLIC_INDEXABLE !== "true" || !settings.indexingEnabled || !settings.sitemapEnabled) return [];
  const [products, news, productCategories] = await Promise.all([
    publishedIndex("products").catch(() => []),
    publishedIndex("blog").catch(() => []),
    query<{ slug: string; seo: Record<string, unknown>; updated_at: Date }>(
      "SELECT slug,seo,updated_at FROM product_categories WHERE enabled=true AND deleted_at IS NULL ORDER BY id LIMIT 1000",
    ).then((value) => value.rows).catch(() => []),
  ]);
  const result = new Map<string, MetadataRoute.Sitemap[number]>();
  function add(paths: Partial<Record<Locale, string>>, updatedAt?: Date | string) {
    const languages: Record<string, string> = {};
    for (const locale of locales) {
      if (paths[locale] !== undefined) languages[locale] = site + href(locale, paths[locale]);
    }
    for (const locale of locales) {
      const url = languages[locale];
      if (url) result.set(url, {
        url,
        lastModified: locale === "en" ? updatedAt : undefined,
        alternates: { languages: languages.en ? { ...languages, "x-default": languages.en } : languages },
      });
    }
  }
  const staticPaths = ["", "/products", "/applications", ...applications.map((item) => `/applications/${item.slug}`),
    "/about", "/manufacturing-quality", "/oem-odm", "/resources", "/blog", "/faq", "/contact", "/privacy-policy", "/terms"];
  const allLocales = (path: string) => Object.fromEntries(locales.map((locale) => [locale, path]));
  for (const path of staticPaths) add(allLocales(path));
  const productSlugs = new Set(products.map((product) => product.slug));
  const categoryBySlug = new Map(productCategories.map((category) => [category.slug, category]));
  for (const category of categories) {
    if (productSlugs.has(category.slug)) continue;
    const record = categoryBySlug.get(category.slug);
    add(categoryPaths(category.slug, record?.seo, site), record?.updated_at);
  }
  for (const category of productCategories) {
    if (!productSlugs.has(category.slug) && !categories.some((item) => item.slug === category.slug)) {
      add(categoryPaths(category.slug, category.seo, site), category.updated_at);
    }
  }
  for (const product of products) add(publishedPaths("products", product, site), product.updated_at);
  for (const article of news) add(publishedPaths("blog", article, site), article.updated_at);
  return [...result.values()];
}
