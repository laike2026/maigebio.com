import { can, getSession, audit } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/definitions";
import { query } from "@/lib/db";
import { allowAdminRate } from "@/lib/admin/rate-limit";

export const runtime = "nodejs";

const exportColumns: Record<string, string[]> = {
  categories: ["id","slug","name_en","name_zh","parent_id","summary_en","sort_order","enabled","updated_at"],
  products: ["id","sku","slug","name_en","summary_en","status","primary_category_id","published_at","updated_at"],
  news_categories: ["id","slug","name_en","name_zh","enabled","sort_order","updated_at"],
  news: ["id","slug","title_en","excerpt_en","author","status","published_at","updated_at"],
  leads: ["id","name","company","email","phone","country","product_interest","message","status_id","owner_id","source_page","utm_source","utm_medium","utm_campaign","submitted_at"],
  media: ["id","original_name","mime_type","size_bytes","alt_text","created_at"],
  audit: ["id","user_id","action","module","object_id","success","created_at"],
  analytics: ["day","event_name","page_path","placement","locale","field_name","event_count"],
  seo_metrics: ["day","page_path","query","country","device","clicks","impressions","position"],
};

function cell(value: unknown) {
  let text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request, context: { params: Promise<{ module: string }> }) {
  const { module } = await context.params;
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, module, "export")) return Response.json({ code: "FORBIDDEN", message: "没有导出权限" }, { status: 403 });
  if (!(await allowAdminRate("export", user.id, 10))) return Response.json({ code: "RATE_LIMIT", message: "导出过于频繁，请稍后重试" }, { status: 429 });
  const columns = exportColumns[module];
  const table = module === "analytics" ? "analytics_daily_summary" : module === "seo_metrics" ? "seo_metrics" : modules[module]?.table;
  if (!columns || !table) return Response.json({ code: "NOT_AVAILABLE" }, { status: 404 });
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 200) || "";
  const base = modules[module]?.softDelete ? "deleted_at IS NULL" : "true";
  const searchColumns = modules[module]?.search || [];
  const params: unknown[] = [];
  const filter = q && searchColumns.length ? ` AND (${searchColumns.map((column) => `${column}::text ILIKE $1`).join(" OR ")})` : "";
  if (filter) params.push(`%${q}%`);
  const encoder = new TextEncoder();
  let offset = 0;
  let complete = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) { controller.enqueue(encoder.encode(`\uFEFF${columns.join(",")}\r\n`)); },
    async pull(controller) {
      if (complete) { controller.close(); return; }
      try {
        const rows = await query(`SELECT ${columns.join(",")} FROM ${table} WHERE ${base}${filter} ORDER BY ${module === "analytics" || module === "seo_metrics" ? "day DESC" : "id DESC"} LIMIT 200 OFFSET ${offset}`, params);
        for (const row of rows.rows) controller.enqueue(encoder.encode(columns.map((column) => cell(row[column])).join(",") + "\r\n"));
        offset += rows.rows.length;
        if (rows.rows.length < 200) complete = true;
      } catch (error) { console.error("Export failed", error instanceof Error ? error.name : "unknown"); controller.error(error); }
    },
  });
  await audit("export", module, user.id, "", null, { query: Boolean(q) });
  await query("INSERT INTO export_jobs(module,status,created_by,finished_at) VALUES($1,'succeeded',$2,now())", [module, user.id]);
  return new Response(stream, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="maige-${module}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
