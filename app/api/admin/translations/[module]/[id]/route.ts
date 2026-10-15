import sanitizeHtml from "sanitize-html";
import { revalidatePath } from "next/cache";
import { audit, can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { isUniqueViolation, query } from "@/lib/db";

export const runtime = "nodejs";
type Params = { params: Promise<{ module: string; id: string }> };
const config = {
  products: { table: "product_translations", parent: "products", foreignKey: "product_id", title: "name" },
  news: { table: "news_translations", parent: "news_articles", foreignKey: "article_id", title: "title" },
} as const;
const validLocales = ["ar", "ru", "es"];
const validStatus = ["missing", "in_progress", "complete"];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(_request: Request, context: Params) {
  const { module, id } = await context.params;
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, module, "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const table = config[module as keyof typeof config]; if (!table) return Response.json({ code: "INVALID_MODULE" }, { status: 404 });
  const result = await query(`SELECT locale,slug,${table.title} AS title,${module === "news" ? "excerpt" : "summary"} AS excerpt,${module === "news" ? "body_html" : "description_html"} AS html,seo,translation_status FROM ${table.table} WHERE ${table.foreignKey}=$1 ORDER BY locale`, [id]);
  return Response.json({ items: result.rows });
}

export async function PUT(request: Request, context: Params) {
  const { module, id } = await context.params;
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, module, "update")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const cfg = config[module as keyof typeof config]; if (!cfg) return Response.json({ code: "INVALID_MODULE" }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !validLocales.includes(String(body.locale)) || !validStatus.includes(String(body.status)) || typeof body.slug !== "string" || !slugPattern.test(body.slug) || body.slug.length > 160 || typeof body.title !== "string" || body.title.trim().length > 250 || typeof body.excerpt !== "string" || body.excerpt.length > 2000 || typeof body.html !== "string" || body.html.length > 200_000 || (body.status === "complete" && !body.title.trim())) return Response.json({ code: "INVALID_TRANSLATION", message: "请检查语言、标题、Slug 和翻译状态" }, { status: 400 });
  const seo = body.seo && typeof body.seo === "object" && !Array.isArray(body.seo) ? body.seo as Record<string, unknown> : {};
  if (Object.entries(seo).some(([key, value]) => key === "noindex" ? typeof value !== "boolean" : typeof value !== "string" || value.length > 500) || ["canonical", "ogImage"].some((key) => seo[key] && !/^https:\/\//.test(String(seo[key])))) return Response.json({ code: "INVALID_SEO", message: "SEO 字段或链接格式无效" }, { status: 400 });
  const parent = await query<{ slug: string }>(`SELECT slug FROM ${cfg.parent} WHERE id=$1 AND deleted_at IS NULL`, [id]);
  if (!parent.rows[0]) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  const collision = await query(`SELECT id FROM ${cfg.parent} WHERE slug=$1 AND id<>$2 AND deleted_at IS NULL LIMIT 1`, [body.slug, id]);
  if (collision.rows.length) return Response.json({ code: "DUPLICATE_SLUG", message: "该 Slug 已用于其他内容" }, { status: 409 });
  const html = sanitizeHtml(body.html, { allowedTags: ["p","br","h2","h3","h4","strong","em","ul","ol","li","blockquote","a","img","table","thead","tbody","tr","th","td","code","pre","hr","iframe"], allowedAttributes: { a: ["href","title","target","rel"], img: ["src","alt","width","height"], iframe: ["src","width","height","allowfullscreen","title"] }, allowedIframeHostnames: ["www.youtube-nocookie.com", "www.youtube.com"], allowedSchemes: ["https","http","mailto"] });
  try {
    if (module === "products") await query(`INSERT INTO product_translations(product_id,locale,slug,name,summary,description_html,seo,translation_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT(product_id,locale) DO UPDATE SET slug=excluded.slug,name=excluded.name,summary=excluded.summary,description_html=excluded.description_html,seo=excluded.seo,translation_status=excluded.translation_status`, [id, body.locale, body.slug, body.title.trim(), body.excerpt.trim(), html, JSON.stringify(seo), body.status]);
    else await query(`INSERT INTO news_translations(article_id,locale,slug,title,excerpt,body_html,seo,translation_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT(article_id,locale) DO UPDATE SET slug=excluded.slug,title=excluded.title,excerpt=excluded.excerpt,body_html=excluded.body_html,seo=excluded.seo,translation_status=excluded.translation_status`, [id, body.locale, body.slug, body.title.trim(), body.excerpt.trim(), html, JSON.stringify(seo), body.status]);
    await audit("update_translation", module, user.id, id, null, { locale: body.locale, status: body.status });
    revalidatePath(`/${body.locale}/${module === "news" ? "blog" : "products"}/${body.slug}`);
    return Response.json({ ok: true });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ code: "DUPLICATE_SLUG", message: "该语言下的 Slug 已存在" }, { status: 409 });
    console.error("Translation save failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ code: "SAVE_FAILED", message: "翻译保存失败" }, { status: 500 });
  }
}
