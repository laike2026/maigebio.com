import { can, getSession } from "@/lib/admin/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "media", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const found = await query<{ url: string; kind: string; original_name: string; mime_type: string; size_bytes: number }>("SELECT url,kind,original_name,mime_type,size_bytes FROM media_assets WHERE id=$1 AND deleted_at IS NULL", [id]);
  if (!found.rows[0]) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  const usages = await query<{ kind: string; id: string; name: string }>(`SELECT 'product main' AS kind,id,name_en AS name FROM products WHERE media_id=$1 AND deleted_at IS NULL
    UNION ALL SELECT 'product gallery',p.id,p.name_en FROM product_media l JOIN products p ON p.id=l.product_id WHERE l.media_id=$1 AND p.deleted_at IS NULL
    UNION ALL SELECT 'category',id,name_en FROM product_categories WHERE image_id=$1 AND deleted_at IS NULL
    UNION ALL SELECT 'news cover',id,title_en FROM news_articles WHERE cover_id=$1 AND deleted_at IS NULL LIMIT 100`, [id]);
  return Response.json({ asset: found.rows[0], usages: usages.rows });
}
