import "server-only";
import sanitizeHtml from "sanitize-html";
import { revalidatePath } from "next/cache";
import { audit, hashPassword, type AdminUser } from "@/lib/admin/auth";
import { modules, type Field, type ModuleDefinition } from "@/lib/admin/definitions";
import { isUniqueViolation, query, transaction, type DbRow } from "@/lib/db";

export class AdminError extends Error {
  constructor(public code: string, message: string, public status = 400, public fields?: Record<string, string>) { super(message); }
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pathPattern = /^\/(?!\/)[^\s?#]*$/;
const jsonArrays = new Set(["features", "applications", "specifications", "tags", "permissions"]);
const jsonObjects = new Set(["attributes", "seo"]);
const contentModules = new Set(["products", "news"]);

function getModule(name: string): ModuleDefinition {
  const module = modules[name];
  if (!module) throw new AdminError("MODULE_NOT_FOUND", "模块不存在", 404);
  return module;
}

function parseField(field: Field, value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    if (field.required) throw new AdminError("FIELD_REQUIRED", `${field.label}不能为空`, 400, { [field.key]: "必填" });
    return null;
  }
  if (field.type === "boolean") return value === true || value === "true";
  if (field.type === "number") {
    const num = Number(value);
    if (!Number.isFinite(num) || Math.abs(num) > 1_000_000_000) throw new AdminError("INVALID_FIELD", `${field.label}不是有效数字`, 400, { [field.key]: "数字无效" });
    return num;
  }
  if (field.type === "datetime") {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new AdminError("INVALID_FIELD", `${field.label}不是有效时间`);
    return date.toISOString();
  }
  if (field.type === "json") {
    let parsed: unknown;
    try { parsed = typeof value === "string" ? JSON.parse(value) : value; }
    catch { throw new AdminError("INVALID_JSON", `${field.label}不是有效 JSON`, 400, { [field.key]: "JSON 格式错误" }); }
    if (jsonArrays.has(field.key) && !Array.isArray(parsed)) throw new AdminError("INVALID_JSON", `${field.label}必须是 JSON 数组`);
    if (jsonObjects.has(field.key) && (typeof parsed !== "object" || !parsed || Array.isArray(parsed))) throw new AdminError("INVALID_JSON", `${field.label}必须是 JSON 对象`);
    if (field.key === "seo") {
      const seo = parsed as Record<string, unknown>;
      for (const key of ["canonical", "ogImage"]) if (seo[key] && (typeof seo[key] !== "string" || !/^https:\/\//.test(seo[key]))) throw new AdminError("INVALID_SEO_URL", `${key} 必须是 HTTPS URL`);
      for (const key of ["title", "description", "keywords", "ogTitle", "ogDescription"]) if (seo[key] && (typeof seo[key] !== "string" || seo[key].length > 500)) throw new AdminError("INVALID_SEO", `${key} 格式无效`);
    }
    return JSON.stringify(parsed);
  }
  if (typeof value !== "string") throw new AdminError("INVALID_FIELD", `${field.label}格式错误`);
  const text = value.trim();
  if (text.length > (field.type === "html" ? 200_000 : field.type === "textarea" ? 20_000 : 500)) throw new AdminError("FIELD_TOO_LONG", `${field.label}过长`);
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new AdminError("INVALID_EMAIL", "邮箱格式错误");
  if (field.type === "select" && field.options && !field.options.some((option) => option.value === text)) throw new AdminError("INVALID_OPTION", `${field.label}选项无效`);
  if (field.key === "slug" && !slugPattern.test(text)) throw new AdminError("INVALID_SLUG", "Slug 只能包含小写字母、数字和连字符");
  if (field.key === "id" && !slugPattern.test(text)) throw new AdminError("INVALID_ID", "ID 只能包含小写字母、数字和连字符");
  if (field.key === "username" && !/^[a-z][a-z0-9._-]{2,31}$/.test(text)) throw new AdminError("INVALID_USERNAME", "账号名格式无效");
  if ((field.key === "source_path" || field.key === "target_path") && !pathPattern.test(text)) throw new AdminError("INVALID_PATH", "路径必须是站内绝对路径");
  if (field.type === "html") return sanitizeHtml(text, {
    allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "em", "ul", "ol", "li", "blockquote", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "code", "pre", "hr", "figure", "figcaption", "iframe"],
    allowedAttributes: { a: ["href", "title", "target", "rel"], img: ["src", "alt", "width", "height"], th: ["colspan", "rowspan"], td: ["colspan", "rowspan"], iframe: ["src", "width", "height", "allowfullscreen", "title", "frameborder"] },
    allowedIframeHostnames: ["www.youtube-nocookie.com", "www.youtube.com"],
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: { a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener noreferrer" } }) },
  });
  return text;
}

function parseInput(module: ModuleDefinition, raw: unknown, create: boolean) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AdminError("INVALID_BODY", "请求内容无效");
  const input = raw as Record<string, unknown>;
  const values: Record<string, unknown> = {};
  for (const field of module.fields) {
    if (field.key === "id" && !create) continue;
    if (!(field.key in input)) {
      if (create && field.required) throw new AdminError("FIELD_REQUIRED", `${field.label}不能为空`, 400, { [field.key]: "必填" });
      continue;
    }
    const parsed = parseField(field, input[field.key]);
    if (create && parsed === null && !field.required) continue;
    values[field.key] = parsed;
  }
  if (Object.keys(values).length === 0) throw new AdminError("EMPTY_UPDATE", "没有可保存的字段");
  return values;
}

function projection(module: ModuleDefinition, detail = false) {
  if (module.key === "users") return detail ? "id,username,email,display_name,role_id,active,must_change_password,locked_until,last_login_at,last_login_ip,created_at,updated_at,deleted_at" : "id,username,email,display_name,role_id,active,last_login_at,created_at";
  if (module.key === "leads" && !detail) return "id,name,company,email,country,product_interest,status_id,owner_id,submitted_at,notification_status";
  return detail ? "*" : ["id", ...module.columns].join(",");
}

export async function listRecords(name: string, search: URLSearchParams) {
  const module = getModule(name);
  const page = Math.max(1, Math.min(100_000, Number(search.get("page")) || 1));
  const sizeParam = Number(search.get("size"));
  const size = [10, 20, 50, 100].includes(sizeParam) ? sizeParam : 20;
  const q = (search.get("q") || "").trim().slice(0, 200);
  const sort = search.get("sort") || module.defaultSort || (module.columns.includes("updated_at") ? "updated_at" : module.columns.at(-1) || "id");
  const sortColumn = ["id", ...module.columns].includes(sort) ? sort : "id";
  const direction = search.get("order") === "asc" ? "ASC" : "DESC";
  const filters: string[] = [];
  const params: unknown[] = [];
  if (module.softDelete) filters.push(search.get("trash") === "true" ? "deleted_at IS NOT NULL" : "deleted_at IS NULL");
  if (q) {
    params.push(`%${q}%`);
    filters.push(`(${module.search.map((column) => `${column}::text ILIKE $${params.length}`).join(" OR ")})`);
  }
  const allowedFilters = module.fields.filter((field) => field.type === "select" || field.type === "boolean" || field.key.endsWith("_id"));
  for (const field of allowedFilters) {
    const value = search.get(field.key);
    if (value === null || value === "") continue;
    params.push(field.type === "boolean" ? value === "true" : value);
    filters.push(`${field.key}=$${params.length}`);
  }
  const extraTextFilters = module.key === "leads" ? ["country", "product_interest", "source_page", "utm_source"] : module.key === "media" ? ["kind"] : [];
  for (const column of extraTextFilters) {
    const value = (search.get(column) || "").trim().slice(0, 100);
    if (!value) continue;
    params.push(`%${value}%`);
    filters.push(`${column} ILIKE $${params.length}`);
  }
  if (module.key === "media" && search.get("unused") === "true") filters.push("NOT EXISTS (SELECT 1 FROM products WHERE media_id=media_assets.id AND deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM product_media WHERE media_id=media_assets.id) AND NOT EXISTS (SELECT 1 FROM product_categories WHERE image_id=media_assets.id AND deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM news_articles WHERE cover_id=media_assets.id AND deleted_at IS NULL)");
  const dateColumn = module.key === "leads" ? "submitted_at" : module.key === "products" || module.key === "news" ? "published_at" : null;
  if (dateColumn) for (const [key, operator] of [["from", ">="], ["to", "<"]] as const) {
    const value = search.get(key) || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) continue;
    params.push(value);
    filters.push(`${dateColumn} ${operator} ${key === "to" ? `($${params.length}::date + interval '1 day')` : `$${params.length}::date`}`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const totalResult = await query<{ total: number }>(`SELECT count(*)::int AS total FROM ${module.table} ${where}`, params);
  const total = Number(totalResult.rows[0]?.total || 0);
  params.push(size, (page - 1) * size);
  const rows = await query(`SELECT ${projection(module)} FROM ${module.table} ${where} ORDER BY ${sortColumn} ${direction} LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return { items: rows.rows, page, size, total, pages: Math.max(1, Math.ceil(total / size)) };
}

export async function getRecord(name: string, id: string) {
  const module = getModule(name);
  const deleted = module.softDelete ? "AND deleted_at IS NULL" : "";
  const result = await query(`SELECT ${projection(module, true)} FROM ${module.table} WHERE id=$1 ${deleted} LIMIT 1`, [id]);
  if (!result.rows[0]) throw new AdminError("NOT_FOUND", "记录不存在", 404);
  return result.rows[0];
}

async function validateBusinessRules(name: string, values: Record<string, unknown>, id?: string) {
  if (name === "leads" && values.status_id) {
    const status = await query("SELECT id FROM lead_statuses WHERE id=$1", [values.status_id]);
    if (!status.rows.length) throw new AdminError("INVALID_STATUS", "询盘状态不存在", 400);
  }
  if (name === "categories" && values.parent_id) {
    if (id && values.parent_id === id) throw new AdminError("CATEGORY_CYCLE", "分类不能设为自己的父级");
    if (id) {
      const descendants = await query<{ id: string }>(
        "WITH RECURSIVE descendants AS (SELECT id FROM product_categories WHERE parent_id=$1 UNION ALL SELECT c.id FROM product_categories c JOIN descendants d ON c.parent_id=d.id) SELECT id FROM descendants WHERE id=$2 LIMIT 1",
        [id, values.parent_id]);
      if (descendants.rows.length) throw new AdminError("CATEGORY_CYCLE", "不能把分类设为子级的下级");
    }
    const ancestors = await query<{ depth: number }>(
      "WITH RECURSIVE ancestors AS (SELECT id,parent_id,1 AS depth FROM product_categories WHERE id=$1 UNION ALL SELECT p.id,p.parent_id,a.depth+1 FROM product_categories p JOIN ancestors a ON p.id=a.parent_id WHERE a.depth<20) SELECT max(depth)::int AS depth FROM ancestors",
      [values.parent_id]);
    if (Number(ancestors.rows[0]?.depth || 0) >= 5) throw new AdminError("CATEGORY_DEPTH", "产品分类最多 5 层");
  }
  if ((name === "categories" || name === "products") && values.slug) {
    if (name === "products" && ["dialysis-tubing", "elisa-kits"].includes(String(values.slug))) throw new AdminError("RESERVED_SLUG", "此 Slug 已用于现有产品分类页面", 409);
    const otherTable = name === "categories" ? "products" : "product_categories";
    const collision = await query(`SELECT id FROM ${otherTable} WHERE slug=$1 AND deleted_at IS NULL LIMIT 1`, [values.slug]);
    if (collision.rows.length) throw new AdminError("SLUG_COLLISION", "该 Slug 已用于产品或分类", 409);
  }
  if (name === "roles" && values.permissions) {
    const arr = JSON.parse(String(values.permissions));
    if (!arr.every((value: unknown) => typeof value === "string" && /^[a-z_*]+:(view|create|update|delete|publish|export|sync|\*)$|^\*$/.test(value))) throw new AdminError("INVALID_PERMISSION", "权限列表格式无效");
  }
}

export async function createRecord(name: string, raw: unknown, user: AdminUser) {
  const module = getModule(name);
  if (module.readOnly || ["leads", "media", "sync", "seo_issues"].includes(name)) throw new AdminError("NOT_ALLOWED", "此模块不能手动新增", 405);
  const values = parseInput(module, raw, true);
  if (name === "news" && values.status === "published") throw new AdminError("MANUAL_PUBLISH_REQUIRED", "请先保存草稿，再点击发布文章", 400);
  if (contentModules.has(name) && values.status === "published" && !canPublish(user, name)) throw new AdminError("PUBLISH_FORBIDDEN", "没有发布权限", 403);
  await validateBusinessRules(name, values);
  if (name === "users") {
    const password = values.temporary_password;
    if (typeof password !== "string" || password.length < 8) throw new AdminError("PASSWORD_TOO_SHORT", "初始密码至少 8 位");
    values.password_hash = await hashPassword(password);
    delete values.temporary_password;
    values.email = String(values.email).toLowerCase();
    values.username = String(values.username).toLowerCase();
  }
  if (name === "sync" && values.frequency_minutes !== undefined && Number(values.frequency_minutes) < 5) throw new AdminError("INVALID_FREQUENCY", "同步间隔至少 5 分钟");
  if (name === "products" || name === "news") {
    if (values.status === "published") values.published_at = new Date().toISOString();
  }
  if (["products", "news", "categories"].includes(name)) values.created_by = user.id;
  if (["products", "news", "categories"].includes(name)) values.updated_by = user.id;
  const columns = Object.keys(values);
  const params = columns.map((column) => values[column]);
  try {
    const result = await query<{ id: string }>(`INSERT INTO ${module.table}(${columns.join(",")}) VALUES(${columns.map((_, index) => `$${index + 1}`).join(",")}) RETURNING id`, params);
    const id = result.rows[0].id;
    await audit("create", name, user.id, id, null, { id });
    revalidateContent(name, values.slug);
    return getRecord(name, id);
  } catch (error) {
    if (isUniqueViolation(error)) throw new AdminError("DUPLICATE", "编号、账号、邮箱或 Slug 已存在", 409);
    throw error;
  }
}

export async function updateRecord(name: string, id: string, raw: unknown, user: AdminUser, options: { allowNewsPublish?: boolean } = {}) {
  const module = getModule(name);
  if (module.readOnly) throw new AdminError("NOT_ALLOWED", "只读模块", 405);
  const old = await getRecord(name, id);
  if (contentModules.has(name) && raw && typeof raw === "object" && "expectedVersion" in raw && Number((raw as Record<string, unknown>).expectedVersion) !== Number(old.version)) throw new AdminError("VERSION_CONFLICT", "内容已被其他人修改，请刷新后重试", 409);
  if (name === "roles" && id === "superadmin") throw new AdminError("PROTECTED_ROLE", "超级管理员权限不能修改", 403);
  if (name === "users" && id === user.id && raw && typeof raw === "object" && (raw as Record<string, unknown>).active === false) throw new AdminError("SELF_DISABLE", "不能停用当前账户");
  const values = parseInput(module, raw, false);
  if (name === "news" && values.status === "published" && old.status !== "published" && !options.allowNewsPublish) throw new AdminError("MANUAL_PUBLISH_REQUIRED", "请在后台点击发布文章", 400);
  if (name === "news" && values.status === "published" && old.status !== "published" && !String(old.body_html_en || "").trim()) throw new AdminError("ARTICLE_BODY_REQUIRED", "请先填写并保存文章正文", 400);
  if (contentModules.has(name) && values.status === "published" && !canPublish(user, name)) throw new AdminError("PUBLISH_FORBIDDEN", "没有发布权限", 403);
  await validateBusinessRules(name, values, id);
  if (name === "users") {
    delete values.temporary_password;
    if (values.email) values.email = String(values.email).toLowerCase();
    if (values.username) values.username = String(values.username).toLowerCase();
  }
  if (name === "products" || name === "news") {
    if (values.status === "published" && old.status !== "published") values.published_at = new Date().toISOString();
  }
  if (["products", "news", "categories"].includes(name)) values.updated_by = user.id;
  if (["products", "news", "categories", "news_categories", "users", "roles", "leads", "sync"].includes(name)) values.updated_at = new Date().toISOString();
  const columns = Object.keys(values);
  if (!columns.length) throw new AdminError("EMPTY_UPDATE", "没有可保存的字段");
  const setters = columns.map((column, index) => `${column}=$${index + 1}`);
  if (contentModules.has(name)) setters.push("version=version+1");
  const params = [...columns.map((column) => values[column]), id];
  try {
    await transaction(async (tx) => {
      if (contentModules.has(name)) await tx.query("INSERT INTO content_versions(module,object_id,version,snapshot,created_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [name, id, old.version, JSON.stringify(old), user.id]);
      await tx.query(`UPDATE ${module.table} SET ${setters.join(",")} WHERE id=$${params.length}`, params);
      if (values.slug && values.slug !== old.slug && (name === "products" || name === "news")) {
        const prefix = name === "products" ? "products" : "blog";
        for (const locale of ["en", "ar", "ru", "es"]) await tx.query("INSERT INTO redirects(source_path,target_path) VALUES($1,$2) ON CONFLICT(source_path) DO UPDATE SET target_path=excluded.target_path,enabled=true", [`/${locale}/${prefix}/${old.slug}`, `/${locale}/${prefix}/${values.slug}`]);
      }
    });
    await audit("update", name, user.id, id, { status: old.status, slug: old.slug }, { status: values.status, slug: values.slug });
    revalidateContent(name, old.slug);
    revalidateContent(name, values.slug);
    return getRecord(name, id);
  } catch (error) {
    if (isUniqueViolation(error)) throw new AdminError("DUPLICATE", "编号、账号、邮箱或 Slug 已存在", 409);
    throw error;
  }
}

function canPublish(user: AdminUser, name: string) {
  const permissions = user.permissions;
  return permissions.includes("*") || permissions.includes(`${name}:*`) || permissions.includes(`${name}:publish`);
}

export async function deleteRecord(name: string, id: string, user: AdminUser) {
  const module = getModule(name);
  if (module.readOnly || ["leads", "sync", "roles", "users"].includes(name)) throw new AdminError("NOT_ALLOWED", "此模块不能直接删除", 405);
  const old = await getRecord(name, id);
  if (name === "lead_statuses") {
    if (old.system_status) throw new AdminError("PROTECTED_STATUS", "内置状态不能删除", 403);
    const used = await query<{ count: number }>("SELECT count(*)::int AS count FROM form_submissions WHERE status_id=$1", [id]);
    if (Number(used.rows[0]?.count || 0) > 0) throw new AdminError("STATUS_IN_USE", "此状态正在被询盘使用", 409);
  }
  if (name === "categories") {
    const children = await query<{ count: number }>("SELECT ((SELECT count(*) FROM product_categories WHERE parent_id=$1 AND deleted_at IS NULL)+(SELECT count(*) FROM products WHERE primary_category_id=$1 AND deleted_at IS NULL)+(SELECT count(*) FROM product_category_links l JOIN products p ON p.id=l.product_id WHERE l.category_id=$1 AND p.deleted_at IS NULL))::int AS count", [id]);
    if ((children.rows[0]?.count || 0) > 0) throw new AdminError("CATEGORY_NOT_EMPTY", "分类仍有子分类或产品，请先迁移", 409);
  }
  if (name === "media") {
    const uses = await query<{ count: number }>("SELECT ((SELECT count(*) FROM products WHERE media_id=$1 AND deleted_at IS NULL)+(SELECT count(*) FROM product_media WHERE media_id=$1)+(SELECT count(*) FROM product_categories WHERE image_id=$1 AND deleted_at IS NULL)+(SELECT count(*) FROM news_articles WHERE cover_id=$1 AND deleted_at IS NULL))::int AS count", [id]);
    if ((uses.rows[0]?.count || 0) > 0) throw new AdminError("MEDIA_IN_USE", "文件正在被内容引用，请先移除关联", 409);
  }
  if (module.softDelete) await query(`UPDATE ${module.table} SET deleted_at=now() WHERE id=$1`, [id]);
  else await query(`DELETE FROM ${module.table} WHERE id=$1`, [id]);
  await audit("delete", name, user.id, id, { slug: old.slug }, null);
  revalidateContent(name, old.slug);
  return { ok: true };
}

export async function restoreRecord(name: string, id: string, user: AdminUser) {
  const module = getModule(name);
  if (!module.softDelete) throw new AdminError("NOT_ALLOWED", "此模块不支持恢复", 405);
  await query(`UPDATE ${module.table} SET deleted_at=NULL WHERE id=$1`, [id]);
  await audit("restore", name, user.id, id);
  return getRecord(name, id);
}

function revalidateContent(name: string, slug: unknown) {
  if (!["products", "categories", "news", "news_categories"].includes(name)) return;
  for (const locale of ["en", "ar", "ru", "es"]) {
    revalidatePath(`/${locale}/${name === "news" || name === "news_categories" ? "blog" : "products"}`);
    if (typeof slug === "string" && slug) revalidatePath(`/${locale}/${name === "news" ? "blog" : "products"}/${slug}`);
  }
  revalidatePath("/sitemap.xml");
}

export function errorResponse(error: unknown) {
  const requestId = crypto.randomUUID();
  if (error instanceof AdminError) return Response.json({ code: error.code, message: error.message, requestId, fields: error.fields }, { status: error.status });
  console.error("Admin API error", requestId, error instanceof Error ? error.name : "unknown");
  return Response.json({ code: "INTERNAL_ERROR", message: "服务器暂时无法处理请求", requestId }, { status: 500 });
}
