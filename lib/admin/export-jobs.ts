import "server-only";
import { modules } from "@/lib/admin/definitions";
import { query, transaction } from "@/lib/db";

export const exportColumns: Record<string, string[]> = {
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

export function exportSpec(module: string, q: string) {
  const columns = exportColumns[module];
  const table = module === "analytics" ? "analytics_daily_summary" : module === "seo_metrics" ? "seo_metrics" : modules[module]?.table;
  if (!columns || !table) return null;
  const base = modules[module]?.softDelete ? "deleted_at IS NULL" : "true";
  const search = modules[module]?.search || [];
  const filter = q && search.length ? ` AND (${search.map((column) => `${column}::text ILIKE $1`).join(" OR ")})` : "";
  return { columns, table, where: `${base}${filter}`, params: filter ? [`%${q}%`] : [], order: module === "analytics" || module === "seo_metrics" ? "day DESC" : "id DESC" };
}

export function exportCell(value: unknown) {
  let str = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}

type Job = { id: string; module: string; query_text: string; processed_count: number; total_count: number };
export async function runExportJobs(maxRows = 500, onlyId?: string) {
  const claimed = await query<Job>(`UPDATE export_jobs SET status='running',updated_at=now()
    WHERE id=(SELECT id FROM export_jobs WHERE (status='pending' OR (status='running' AND updated_at<now()-interval '10 minutes'))
    AND ($1::uuid IS NULL OR id=$1::uuid) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING id,module,query_text,processed_count,total_count`, [onlyId || null]);
  const job = claimed.rows[0]; if (!job) return null;
  const spec = exportSpec(job.module, job.query_text);
  if (!spec) { await query("UPDATE export_jobs SET status='failed',error_text='不支持的导出模块',finished_at=now() WHERE id=$1", [job.id]); return { id: job.id, status: "failed" }; }
  try {
    const limit = Math.min(500, Math.max(1, maxRows));
    const count = Number(job.processed_count);
    const rows = await query(`SELECT ${spec.columns.join(",")} FROM ${spec.table} WHERE ${spec.where} ORDER BY ${spec.order} LIMIT ${limit} OFFSET ${count}`, spec.params);
    const csv = `${count === 0 ? `\uFEFF${spec.columns.join(",")}\r\n` : ""}${rows.rows.map((row) => spec.columns.map((column) => exportCell(row[column])).join(",") + "\r\n").join("")}`;
    const processed = count + rows.rows.length;
    const done = rows.rows.length < limit || processed >= Number(job.total_count);
    await transaction(async (db) => {
      await db.query("INSERT INTO export_job_chunks(job_id,sequence,csv_text) VALUES($1,$2,$3) ON CONFLICT(job_id,sequence) DO UPDATE SET csv_text=excluded.csv_text", [job.id, count, csv]);
      await db.query("UPDATE export_jobs SET status=$2,processed_count=$3,updated_at=now(),finished_at=CASE WHEN $4 THEN now() ELSE NULL END WHERE id=$1", [job.id, done ? "succeeded" : "pending", processed, done]);
    });
    return { id: job.id, status: done ? "succeeded" : "pending", processed };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : "导出失败";
    await query("UPDATE export_jobs SET status='failed',error_text=$2,finished_at=now(),updated_at=now() WHERE id=$1", [job.id, message]);
    return { id: job.id, status: "failed", error: message };
  }
}
