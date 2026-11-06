import "server-only";
import { cache } from "react";
import { query } from "@/lib/db";
import { categories, href, isLocale, locales, type Locale } from "@/lib/site";

export type ContentArea = "products" | "blog";
type Variant = { slug: string; seo: Record<string, unknown> | null };
export type IndexEntry = {
  id: string;
  slug: string;
  seo: Record<string, unknown> | null;
  updated_at: Date | string;
  variants: Record<string, Variant> | null;
};

const content = {
  products: { table: "products", translations: "product_translations", parent: "product_id", title: "name" },
  blog: { table: "news_articles", translations: "news_translations", parent: "article_id", title: "title" },
} as const;

export const publishedIndex = cache(async (area: ContentArea, id?: string) => {
  const fields = content[area];
  const result = await query<IndexEntry>(`
    SELECT p.id,p.slug,p.seo,p.updated_at,
      (SELECT jsonb_object_agg(t.locale,jsonb_build_object('slug',t.slug,'seo',t.seo))
       FROM ${fields.translations} t
       WHERE t.${fields.parent}=p.id AND t.translation_status='complete' AND btrim(t.${fields.title})<>'') AS variants
    FROM ${fields.table} p
    WHERE p.status='published' AND p.deleted_at IS NULL
      AND (p.published_at IS NULL OR p.published_at<=now()) AND ($1::uuid IS NULL OR p.id=$1)
    ORDER BY p.id LIMIT 5000`, [id ?? null]);
  return result.rows;
});

export function indexableContent(seo: Record<string, unknown> | null, canonical: string) {
  const override = seo?.canonical;
  return seo?.noindex !== true &&
    (typeof override !== "string" || !override.startsWith("https://") || override === canonical);
}

export function publishedPaths(area: ContentArea, entry: IndexEntry, site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "") {
  const variants = { ...(entry.variants ?? {}), en: { slug: entry.slug, seo: entry.seo } };
  const paths: Partial<Record<Locale, string>> = {};
  for (const [locale, variant] of Object.entries(variants)) {
    if (!isLocale(locale) || !variant?.slug) continue;
    const path = `/${area}/${variant.slug}`;
    if (indexableContent(variant.seo, site + href(locale, path))) paths[locale] = path;
  }
  return paths;
}

export function categoryPaths(slug: string, seo?: Record<string, unknown>, site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "") {
  const path = `/products/${slug}`;
  const paths: Partial<Record<Locale, string>> = categories.some((category) => category.slug === slug)
    ? Object.fromEntries(locales.map((locale) => [locale, path]))
    : { en: path };
  if (seo && !indexableContent(seo, site + href("en", path))) delete paths.en;
  return paths;
}
