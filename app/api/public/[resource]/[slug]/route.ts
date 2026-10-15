import { isLocale } from "@/lib/site";
import { publishedArticle, publishedCategory, publishedProduct } from "@/lib/public-content";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ resource: string; slug: string }> }) {
  const { resource, slug } = await context.params;
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  const rawLocale = new URL(request.url).searchParams.get("locale") || "en";
  if (!isLocale(rawLocale)) return Response.json({ code: "INVALID_LOCALE" }, { status: 400 });
  let item;
  if (resource === "products") item = await publishedProduct(rawLocale, slug);
  else if (resource === "categories") item = await publishedCategory(slug);
  else if (resource === "news") item = await publishedArticle(rawLocale, slug);
  else if (resource === "related-products") {
    const product = await publishedProduct(rawLocale, slug);
    if (!product) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
    const rows = await query("SELECT p.slug,p.name_en AS name,p.summary_en AS summary,m.url AS image_url FROM product_relations r JOIN products p ON p.id=r.related_id LEFT JOIN media_assets m ON m.id=p.media_id WHERE r.product_id=$1 AND p.status='published' AND p.deleted_at IS NULL LIMIT 12", [product.id]);
    return Response.json({ items: rows.rows }, { headers: { "Cache-Control": "no-store" } });
  } else return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  return item ? Response.json(item, { headers: { "Cache-Control": "no-store" } }) : Response.json({ code: "NOT_FOUND" }, { status: 404 });
}
