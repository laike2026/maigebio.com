import { revalidatePath } from "next/cache";
import { audit, can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { query, transaction } from "@/lib/db";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f-]{36}$/i;
const configs = { products: ["news_related_products", "product_id", "products"], articles: ["news_related_articles", "related_id", "news_articles"] } as const;
export async function GET(_request: Request, context: Params) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "news", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params; if (!uuid.test(id)) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const [products, articles] = await Promise.all([
    query<{ id: string; label: string }>("SELECT p.id,p.name_en AS label FROM news_related_products l JOIN products p ON p.id=l.product_id WHERE l.article_id=$1 ORDER BY p.name_en", [id]),
    query<{ id: string; label: string }>("SELECT a.id,a.title_en AS label FROM news_related_articles l JOIN news_articles a ON a.id=l.related_id WHERE l.article_id=$1 ORDER BY a.title_en", [id]),
  ]);
  return Response.json({ products: products.rows, articles: articles.rows });
}
export async function PUT(request: Request, context: Params) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "news", "update")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const { id } = await context.params; if (!uuid.test(id)) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !Object.entries(body).every(([key, values]) => key in configs && Array.isArray(values) && values.length <= 100 && values.every((value) => typeof value === "string" && uuid.test(value)) && new Set(values).size === values.length && (key !== "articles" || !values.includes(id)))) return Response.json({ code: "INVALID_RELATIONS" }, { status: 400 });
  const found = await query<{ slug: string }>("SELECT slug FROM news_articles WHERE id=$1 AND deleted_at IS NULL", [id]); if (!found.rows[0]) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  try {
    await transaction(async (tx) => {
      for (const [key, values] of Object.entries(body)) {
        const [linkTable, column, target] = configs[key as keyof typeof configs];
        for (const value of values as string[]) if (!(await tx.query(`SELECT id FROM ${target} WHERE id=$1 AND deleted_at IS NULL`, [value])).rows.length) throw new Error("MISSING_RELATION");
        await tx.query(`DELETE FROM ${linkTable} WHERE article_id=$1`, [id]);
        for (const value of values as string[]) await tx.query(`INSERT INTO ${linkTable}(article_id,${column}) VALUES($1,$2)`, [id, value]);
      }
    });
    await audit("update_relations", "news", user.id, id, null, Object.fromEntries(Object.entries(body).map(([key, value]) => [key, (value as unknown[]).length])));
    for (const locale of ["en", "ar", "ru", "es"]) revalidatePath(`/${locale}/blog/${found.rows[0].slug}`);
    return Response.json({ ok: true });
  } catch (error) { return Response.json({ code: "RELATION_FAILED", message: error instanceof Error && error.message === "MISSING_RELATION" ? "关联内容不存在" : "保存关联失败" }, { status: 409 }); }
}
