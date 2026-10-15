import "server-only";
import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { audit, can, type AdminUser } from "@/lib/admin/auth";
import { createRecord } from "@/lib/admin/records";
import { query } from "@/lib/db";
import { getMedia, removeMedia } from "@/lib/media-storage";

export const templates: Record<string, string[]> = {
  categories: ["name_en", "name_zh", "slug", "parent_id", "summary_en", "sort_order", "enabled"],
  products: ["name_en", "sku", "slug", "primary_category_id", "status", "summary_en", "description_html_en", "featured", "sort_order"],
};
const required: Record<string, string[]> = { categories: ["name_en", "slug"], products: ["name_en", "sku", "slug"] };

export async function readImportRows(filename: string, bytes: Buffer, module: string) {
  const keys = templates[module]; if (!keys) throw new Error("INVALID_MODULE");
  if (bytes.length > 20 * 1024 * 1024) throw new Error("文件超过 20 MB");
  let rows: Record<string, unknown>[];
  if (/\.csv$/i.test(filename)) {
    const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
    rows = parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_quotes: false, max_record_size: 100_000 }) as Record<string, unknown>[];
  } else if (/\.xlsx$/i.test(filename) && bytes.subarray(0, 2).toString("ascii") === "PK") {
    const book = new ExcelJS.Workbook(); await book.xlsx.load(bytes as unknown as ExcelJS.Buffer);
    const sheet = book.worksheets[0]; if (!sheet) throw new Error("Excel 没有工作表");
    const headings = (sheet.getRow(1).values as (string | null)[]).slice(1).map((value) => String(value || "").trim());
    rows = [];
    sheet.eachRow((row, number) => { if (number === 1) return; const data: Record<string, unknown> = {}; headings.forEach((key, index) => { if (key) data[key] = row.getCell(index + 1).text; }); rows.push(data); });
  } else throw new Error("只支持 CSV 或 XLSX 文件");
  const headings = rows[0] ? Object.keys(rows[0]) : [];
  if (!required[module].every((key) => headings.includes(key))) throw new Error("模板缺少必填列");
  if (rows.length > 20_000) throw new Error("单次最多 20,000 行");
  return rows.map((row) => Object.fromEntries(keys.filter((key) => row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "").map((key) => [key, row[key]])));
}

type Job = { id: string; module: string; filename: string; source_key: string; processed_count: number; success_count: number; failure_count: number; error_report: { row: number; message: string }[]; created_by: string; user_id: string; email: string; display_name: string; role_id: string; must_change_password: boolean; permissions: string[] };

export async function runImportJobs(maxRows = 300, onlyId?: string) {
  const claimed = await query<Job>(`UPDATE import_jobs SET status='running',started_at=COALESCE(started_at,now()),updated_at=now()
    WHERE id=(SELECT id FROM import_jobs WHERE (status='pending' OR (status='running' AND updated_at<now()-interval '10 minutes')) AND ($1::uuid IS NULL OR id=$1::uuid) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING id,module,filename,source_key,processed_count,success_count,failure_count,error_report,created_by`, [onlyId || null]);
  const row = claimed.rows[0]; if (!row) return null;
  const owner = await query<Job>(`SELECT u.id AS user_id,u.email,u.display_name,u.role_id,u.must_change_password,r.permissions FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 AND u.active=true`, [row.created_by]);
  if (!owner.rows[0]) { await query("UPDATE import_jobs SET status='failed',finished_at=now(),error_report=$2 WHERE id=$1", [row.id, JSON.stringify([{ row: 0, message: "创建人账户已停用" }])]); return { id: row.id, status: "failed", processed: 0 }; }
  const user: AdminUser = { id: owner.rows[0].user_id, email: owner.rows[0].email, display_name: owner.rows[0].display_name, role_id: owner.rows[0].role_id, must_change_password: owner.rows[0].must_change_password, permissions: owner.rows[0].permissions };
  if (!can(user, row.module, "create")) { await query("UPDATE import_jobs SET status='failed',finished_at=now(),error_report=$2 WHERE id=$1", [row.id, JSON.stringify([{ row: 0, message: "创建人已失去导入权限" }])]); return { id: row.id, status: "failed", processed: 0 }; }
  try {
    const rows = await readImportRows(row.filename, Buffer.from(await getMedia(row.source_key)), row.module);
    await query("UPDATE import_jobs SET total_count=$2,updated_at=now() WHERE id=$1", [row.id, rows.length]);
    let success = Number(row.success_count); let failure = Number(row.failure_count); let index = Number(row.processed_count);
    const errors = Array.isArray(row.error_report) ? row.error_report : [];
    for (; index < Math.min(rows.length, Number(row.processed_count) + maxRows); index++) {
      try { await createRecord(row.module, rows[index], user); success++; }
      catch (error) { failure++; errors.push({ row: index + 2, message: error instanceof Error ? error.message.slice(0, 200) : "导入失败" }); }
      await query("UPDATE import_jobs SET processed_count=$2,success_count=$3,failure_count=$4,error_report=$5,updated_at=now() WHERE id=$1", [row.id, index + 1, success, failure, JSON.stringify(errors)]);
    }
    const done = index >= rows.length;
    await query("UPDATE import_jobs SET status=$2,finished_at=CASE WHEN $3 THEN now() ELSE NULL END,updated_at=now() WHERE id=$1", [row.id, done ? failure ? "partial" : "succeeded" : "pending", done]);
    if (done) { await audit("import", row.module, user.id, row.id, null, { success, failed: failure }); await removeMedia(row.source_key).catch(() => {}); }
    return { id: row.id, status: done ? failure ? "partial" : "succeeded" : "pending", processed: index };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : "导入任务失败";
    await query("UPDATE import_jobs SET status='failed',finished_at=now(),error_report=$2,updated_at=now() WHERE id=$1", [row.id, JSON.stringify([{ row: 0, message }])]);
    return { id: row.id, status: "failed", processed: Number(row.processed_count), error: message };
  }
}
