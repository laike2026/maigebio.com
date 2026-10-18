import "server-only";
import { query } from "@/lib/db";
import type { Locale } from "@/lib/site";

export type PublicProduct = { id: string; sku: string; slug: string; name: string; summary: string; description_html: string; image_url: string | null; category_slug: string | null; seo: Record<string, unknown>; specifications: unknown[]; features: unknown[]; applications: unknown[]; price_mode: string };
export type PublicArticle = { id: string; slug: string; title: string; excerpt: string; body_html: string; image_url: string | null; published_at: string; seo: Record<string, unknown> };
export type PublicCategory = { id: string; slug: string; name: string; summary: string; description_html: string; image_url: string | null; seo: Record<string, unknown> };

export async function publishedProducts(locale: Locale, options: { q?: string; category?: string; page?: number; size?: number; offset?: number; featured?: boolean } = {}) {
  const page = Math.max(1, Math.min(10000, options.page || 1));
  const size = Math.max(1, Math.min(101, options.size || 20));
  const q = (options.q || "").trim().slice(0, 150);
  const category = (options.category || "").trim();
  try {
    const rows = await query<PublicProduct>(
      `SELECT p.id,p.sku,COALESCE(NULLIF(t.slug,''),p.slug) AS slug,COALESCE(NULLIF(t.name,''),p.name_en) AS name,
       COALESCE(NULLIF(t.summary,''),p.summary_en) AS summary,COALESCE(NULLIF(t.description_html,''),p.description_html_en) AS description_html,
       m.url AS image_url,c.slug AS category_slug,COALESCE(t.seo,p.seo) AS seo,p.specifications,p.features,p.applications,p.price_mode
       FROM products p LEFT JOIN product_translations t ON t.product_id=p.id AND t.locale=$1 AND t.translation_status='complete'
       LEFT JOIN product_categories c ON c.id=p.primary_category_id LEFT JOIN media_assets m ON m.id=p.media_id AND m.deleted_at IS NULL
       WHERE p.status='published' AND p.deleted_at IS NULL AND (p.published_at IS NULL OR p.published_at<=now())
         AND ($2='' OR p.name_en ILIKE '%'||$2||'%' OR p.sku ILIKE '%'||$2||'%')
         AND ($3='' OR c.slug=$3) AND ($6=false OR p.featured=true)
       ORDER BY p.pinned DESC,p.sort_order ASC,p.published_at DESC,p.id DESC LIMIT $4 OFFSET $5`, [locale, q, category, size, options.offset ?? (page - 1) * size, Boolean(options.featured)]);
    return rows.rows;
  } catch (error) { console.error("Public product read failed", error instanceof Error ? error.name : "unknown"); return []; }
}

export async function publishedProduct(locale: Locale, slug: string) {
  try {
    const rows = await query<PublicProduct>(
      `SELECT p.id,p.sku,COALESCE(NULLIF(t.slug,''),p.slug) AS slug,COALESCE(NULLIF(t.name,''),p.name_en) AS name,
       COALESCE(NULLIF(t.summary,''),p.summary_en) AS summary,COALESCE(NULLIF(t.description_html,''),p.description_html_en) AS description_html,
       m.url AS image_url,c.slug AS category_slug,COALESCE(t.seo,p.seo) AS seo,p.specifications,p.features,p.applications,p.price_mode
       FROM products p LEFT JOIN product_translations t ON t.product_id=p.id AND t.locale=$1 AND t.translation_status='complete'
       LEFT JOIN product_categories c ON c.id=p.primary_category_id LEFT JOIN media_assets m ON m.id=p.media_id AND m.deleted_at IS NULL
       WHERE (p.slug=$2 OR t.slug=$2) AND p.status='published' AND p.deleted_at IS NULL AND (p.published_at IS NULL OR p.published_at<=now()) LIMIT 1`, [locale, slug]);
    return rows.rows[0] || null;
  } catch { return null; }
}

export async function publishedProductRelations(productId: string) {
  try {
    const [media, related] = await Promise.all([
      query<{ id: string; name: string; url: string; kind: string; alt_text: string }>(
        "SELECT m.id,m.original_name AS name,m.url,m.kind,m.alt_text FROM product_media l JOIN media_assets m ON m.id=l.media_id WHERE l.product_id=$1 AND m.deleted_at IS NULL ORDER BY l.sort_order LIMIT 30", [productId]),
      query<{ slug: string; name: string; summary: string; image_url: string | null }>(
        "SELECT p.slug,p.name_en AS name,p.summary_en AS summary,m.url AS image_url FROM product_relations l JOIN products p ON p.id=l.related_id LEFT JOIN media_assets m ON m.id=p.media_id WHERE l.product_id=$1 AND p.status='published' AND p.deleted_at IS NULL ORDER BY p.sort_order,p.name_en LIMIT 12", [productId]),
    ]);
    return { media: media.rows, related: related.rows };
  } catch { return { media: [], related: [] }; }
}

export async function publishedCategories() {
  try {
    const rows = await query<PublicCategory>(
      "SELECT c.id,c.slug,c.name_en AS name,c.summary_en AS summary,c.description_html_en AS description_html,m.url AS image_url,c.seo FROM product_categories c LEFT JOIN media_assets m ON m.id=c.image_id WHERE c.enabled=true AND c.deleted_at IS NULL ORDER BY c.sort_order,c.name_en LIMIT 200");
    return rows.rows;
  } catch { return []; }
}

export async function publishedCategory(slug: string) {
  try {
    const rows = await query<PublicCategory>("SELECT c.id,c.slug,c.name_en AS name,c.summary_en AS summary,c.description_html_en AS description_html,m.url AS image_url,c.seo FROM product_categories c LEFT JOIN media_assets m ON m.id=c.image_id WHERE c.slug=$1 AND c.enabled=true AND c.deleted_at IS NULL LIMIT 1", [slug]);
    return rows.rows[0] || null;
  } catch { return null; }
}

export async function publishedArticles(locale: Locale, options: { q?: string; category?: string; page?: number; size?: number; offset?: number } = {}) {
  const page = Math.max(1, Math.min(10000, options.page || 1));
  const size = Math.max(1, Math.min(101, options.size || 20));
  try {
    const rows = await query<PublicArticle>(
      `SELECT a.id,COALESCE(NULLIF(t.slug,''),a.slug) AS slug,COALESCE(NULLIF(t.title,''),a.title_en) AS title,
       COALESCE(NULLIF(t.excerpt,''),a.excerpt_en) AS excerpt,COALESCE(NULLIF(t.body_html,''),a.body_html_en) AS body_html,
       m.url AS image_url,a.published_at,COALESCE(t.seo,a.seo) AS seo
       FROM news_articles a LEFT JOIN news_translations t ON t.article_id=a.id AND t.locale=$1 AND t.translation_status='complete'
       LEFT JOIN media_assets m ON m.id=a.cover_id AND m.deleted_at IS NULL LEFT JOIN news_categories c ON c.id=a.category_id
       WHERE a.status='published' AND a.deleted_at IS NULL
       AND ($2='' OR a.title_en ILIKE '%'||$2||'%') AND ($3='' OR c.slug=$3)
       ORDER BY a.pinned DESC,a.published_at DESC,a.id DESC LIMIT $4 OFFSET $5`, [locale, (options.q || "").slice(0, 150), options.category || "", size, options.offset ?? (page - 1) * size]);
    return rows.rows;
  } catch { return []; }
}

export async function publishedArticle(locale: Locale, slug: string) {
  try {
    const rows = await query<PublicArticle>(
      `SELECT a.id,COALESCE(NULLIF(t.slug,''),a.slug) AS slug,COALESCE(NULLIF(t.title,''),a.title_en) AS title,
       COALESCE(NULLIF(t.excerpt,''),a.excerpt_en) AS excerpt,COALESCE(NULLIF(t.body_html,''),a.body_html_en) AS body_html,
       m.url AS image_url,a.published_at,COALESCE(t.seo,a.seo) AS seo
       FROM news_articles a LEFT JOIN news_translations t ON t.article_id=a.id AND t.locale=$1 AND t.translation_status='complete'
       LEFT JOIN media_assets m ON m.id=a.cover_id AND m.deleted_at IS NULL
       WHERE (a.slug=$2 OR t.slug=$2) AND a.status='published' AND a.deleted_at IS NULL LIMIT 1`, [locale, slug]);
    return rows.rows[0] || null;
  } catch { return null; }
}

export async function publishedArticleRelations(articleId: string) {
  try {
    const [products, articles] = await Promise.all([
      query<{ slug: string; title: string }>("SELECT p.slug,p.name_en AS title FROM news_related_products l JOIN products p ON p.id=l.product_id WHERE l.article_id=$1 AND p.status='published' AND p.deleted_at IS NULL ORDER BY p.name_en LIMIT 12", [articleId]),
      query<{ slug: string; title: string }>("SELECT a.slug,a.title_en AS title FROM news_related_articles l JOIN news_articles a ON a.id=l.related_id WHERE l.article_id=$1 AND a.status='published' AND a.deleted_at IS NULL ORDER BY a.title_en LIMIT 12", [articleId]),
    ]);
    return { products: products.rows, articles: articles.rows };
  } catch { return { products: [], articles: [] }; }
}

export async function redirectTarget(path: string) {
  try { const rows = await query<{ target_path: string }>("SELECT target_path FROM redirects WHERE source_path=$1 AND enabled=true LIMIT 1", [path]); return rows.rows[0]?.target_path || null; }
  catch { return null; }
}
