import { revalidatePath } from "next/cache";
import { audit, can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { query, transaction } from "@/lib/db";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "products", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!uuid.test(id)) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const [categories, media, related] = await Promise.all([
    query<{ id: string; label: string }>("SELECT c.id,c.name_en AS label FROM product_category_links l JOIN product_categories c ON c.id=l.category_id WHERE l.product_id=$1 ORDER BY c.sort_order,c.name_en", [id]),
    query<{ id: string; label: string }>("SELECT m.id,m.original_name AS label FROM product_media l JOIN media_assets m ON m.id=l.media_id WHERE l.product_id=$1 ORDER BY l.sort_order", [id]),
    query<{ id: string; label: string }>("SELECT p.id,p.name_en AS label FROM product_relations l JOIN products p ON p.id=l.related_id WHERE l.product_id=$1 ORDER BY p.name_en", [id]),
  ]);
  return Response.json({ categories: categories.rows, media: media.rows, related: related.rows });
}

export async function PUT(request: Request, context: Params) {
  const { id } = await context.params;
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "products", "update")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  if (!uuid.test(id)) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const fields = { categories: ["product_category_links", "category_id", "product_categories"], media: ["product_media", "media_id", "media_assets"], related: ["product_relations", "related_id", "products"] } as const;
  if (!body || typeof body !== "object") return Response.json({ code: "INVALID_BODY" }, { status: 400 });
  for (const [field, values] of Object.entries(body)) {
    if (!(field in fields) || !Array.isArray(values) || values.length > 100 || !values.every((value) => typeof value === "string" && uuid.test(value)) || new Set(values).size !== values.length) return Response.json({ code: "INVALID_RELATIONS", message: "关联项无效或数量过多" }, { status: 400 });
    if (field === "related" && values.includes(id)) return Response.json({ code: "SELF_RELATION", message: "不能关联产品自身" }, { status: 400 });
  }
  const existing = await query<{ slug: string }>("SELECT slug FROM products WHERE id=$1 AND deleted_at IS NULL", [id]);
  if (!existing.rows[0]) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  try {
    await transaction(async (tx) => {
      for (const [field, values] of Object.entries(body)) {
        const [linkTable, linkColumn, targetTable] = fields[field as keyof typeof fields];
        for (const value of values as string[]) {
          const valid = await tx.query(`SELECT id FROM ${targetTable} WHERE id=$1 AND deleted_at IS NULL`, [value]);
          if (!valid.rows.length) throw new Error("MISSING_RELATION");
        }
        await tx.query(`DELETE FROM ${linkTable} WHERE product_id=$1`, [id]);
        for (let i = 0; i < (values as string[]).length; i++) {
          if (field === "media") await tx.query(`INSERT INTO ${linkTable}(product_id,${linkColumn},sort_order) VALUES($1,$2,$3)`, [id, (values as string[])[i], i]);
          else await tx.query(`INSERT INTO ${linkTable}(product_id,${linkColumn}) VALUES($1,$2)`, [id, (values as string[])[i]]);
        }
      }
    });
    await audit("update_relations", "products", user.id, id, null, Object.fromEntries(Object.entries(body).map(([key, value]) => [key, (value as unknown[]).length])));
    for (const locale of ["en", "ar", "ru", "es"]) revalidatePath(`/${locale}/products/${existing.rows[0].slug}`);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_RELATION") return Response.json({ code: "MISSING_RELATION", message: "关联记录已不存在" }, { status: 409 });
    console.error("Product relations update failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ code: "UPDATE_FAILED", message: "关联保存失败" }, { status: 500 });
  }
}
