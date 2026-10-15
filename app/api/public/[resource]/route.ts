import { isLocale } from "@/lib/site";
import { publishedArticles, publishedCategories, publishedProducts } from "@/lib/public-content";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params;
  const search = new URL(request.url).searchParams;
  const rawLocale = search.get("locale") || "en";
  if (!isLocale(rawLocale)) return Response.json({ code: "INVALID_LOCALE" }, { status: 400 });
  const page = Math.max(1, Math.min(10000, Number(search.get("page")) || 1));
  const size = Math.max(1, Math.min(100, Number(search.get("size")) || 20));
  if (resource === "products") {
    const items = await publishedProducts(rawLocale, { q: search.get("q") || "", category: search.get("category") || "", page, size: size + 1, offset: (page - 1) * size });
    return Response.json({ items: items.slice(0, size), page, size, hasMore: items.length > size }, { headers: { "Cache-Control": "no-store" } });
  }
  if (resource === "categories") return Response.json({ items: await publishedCategories() }, { headers: { "Cache-Control": "no-store" } });
  if (resource === "news") {
    const items = await publishedArticles(rawLocale, { q: search.get("q") || "", category: search.get("category") || "", page, size: size + 1, offset: (page - 1) * size });
    return Response.json({ items: items.slice(0, size), page, size, hasMore: items.length > size }, { headers: { "Cache-Control": "no-store" } });
  }
  if (resource === "news-categories") {
    const rows = await query("SELECT slug,name_en,seo FROM news_categories WHERE enabled=true AND deleted_at IS NULL ORDER BY sort_order,name_en LIMIT 200");
    return Response.json({ items: rows.rows }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ code: "NOT_FOUND" }, { status: 404 });
}
