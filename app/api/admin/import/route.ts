import { randomUUID } from "node:crypto";
import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { readImportRows, templates } from "@/lib/admin/import-jobs";
import { query } from "@/lib/db";
import { putMedia } from "@/lib/media-storage";
import { allowAdminRate } from "@/lib/admin/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const module = new URL(request.url).searchParams.get("module") || "";
  if (!templates[module] || !can(user, module, "create")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  return new Response(`\uFEFF${templates[module].join(",")}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="maige-${module}-template.csv"` } });
}

export async function POST(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  if (!(await allowAdminRate("import-upload", user.id, 10))) return Response.json({ code: "RATE_LIMIT", message: "导入过于频繁，请稍后重试" }, { status: 429 });
  if (Number(request.headers.get("content-length") || 0) > 4 * 1024 * 1024) return Response.json({ code: "FILE_TOO_LARGE", message: "超过 4 MB 请使用直传" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const module = String(form?.get("module") || ""); const file = form?.get("file"); const preview = form?.get("preview") === "true";
  if (!templates[module] || !can(user, module, "create")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(file instanceof File)) return Response.json({ code: "NO_FILE" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return Response.json({ code: "FILE_TOO_LARGE", message: "超过 4 MB 请使用直传" }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  let rows;
  try { rows = await readImportRows(file.name, bytes, module); }
  catch (error) { return Response.json({ code: "INVALID_FILE", message: error instanceof Error ? error.message : "文件读取失败" }, { status: 400 }); }
  if (preview) return Response.json({ total: rows.length, columns: templates[module], rows: rows.slice(0, 20) });
  const id = randomUUID(); const key = `imports/${id}.${file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv"}`;
  await putMedia(key, bytes, file.type || "application/octet-stream");
  await query("INSERT INTO import_jobs(id,module,status,filename,source_key,total_count,created_by) VALUES($1,$2,'pending',$3,$4,$5,$6)", [id, module, file.name.slice(0, 255), key, rows.length, user.id]);
  return Response.json({ jobId: id, status: "pending", total: rows.length }, { status: 202 });
}
