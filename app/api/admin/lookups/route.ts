import { can, getSession } from "@/lib/admin/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
const kinds = {
  categories: { table: "product_categories", label: "name_en", filter: "deleted_at IS NULL", scope: "categories" },
  products: { table: "products", label: "name_en", filter: "deleted_at IS NULL", scope: "products" },
  news: { table: "news_articles", label: "title_en", filter: "deleted_at IS NULL", scope: "news" },
  news_categories: { table: "news_categories", label: "name_en", filter: "deleted_at IS NULL", scope: "news_categories" },
  media: { table: "media_assets", label: "original_name", filter: "deleted_at IS NULL", scope: "media" },
  users: { table: "users", label: "display_name", filter: "active=true AND deleted_at IS NULL", scope: "users" },
  roles: { table: "roles", label: "name_zh", filter: "true", scope: "users" },
} as const;
export async function GET(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") || ""; const config = kinds[kind as keyof typeof kinds];
  if (!config) return Response.json({ code: "INVALID_KIND" }, { status: 400 });
  if (!can(user, config.scope, "view") && !(kind === "users" && can(user, "leads", "update"))) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const q = (params.get("q") || "").slice(0, 100);
  const id = (params.get("id") || "").slice(0, 100);
  const rows = await query<{ id: string; label: string }>(`SELECT id,${config.label} AS label FROM ${config.table} WHERE ${config.filter} AND ($1='' OR ${config.label} ILIKE '%'||$1||'%') AND ($2='' OR id::text=$2) ORDER BY ${config.label} LIMIT 25`, [q, id]);
  return Response.json({ items: rows.rows });
}
