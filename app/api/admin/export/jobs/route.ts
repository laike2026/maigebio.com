import { audit, can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { exportSpec, runExportJobs } from "@/lib/admin/export-jobs";
import { allowAdminRate } from "@/lib/admin/rate-limit";
import { query } from "@/lib/db";

export const runtime = "nodejs";
const validId = (id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);

export async function GET(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!validId(id)) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const found = await query<{ id: string; module: string; status: string; total_count: number; processed_count: number; created_by: string; error_text: string | null }>("SELECT id,module,status,total_count,processed_count,created_by,error_text FROM export_jobs WHERE id=$1", [id]);
  const job = found.rows[0]; if (!job) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  if (job.created_by !== user.id || !can(user, job.module, "export")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  return Response.json({ id: job.id, module: job.module, status: job.status, total: job.total_count, processed: job.processed_count, error: job.error_text, download: job.status === "succeeded" ? `/api/admin/export/jobs/${job.id}/download` : null });
}

export async function POST(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (validId(body.id)) {
    const found = await query<{ module: string; created_by: string }>("SELECT module,created_by FROM export_jobs WHERE id=$1", [body.id]);
    if (!found.rows[0]) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
    if (found.rows[0].created_by !== user.id || !can(user, found.rows[0].module, "export")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
    return Response.json({ outcome: await runExportJobs(500, body.id) });
  }
  const module = typeof body.module === "string" ? body.module : "";
  const q = typeof body.q === "string" ? body.q.trim().slice(0, 200) : "";
  if (!can(user, module, "export")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await allowAdminRate("export", user.id, 10))) return Response.json({ code: "RATE_LIMIT", message: "导出过于频繁，请稍后重试" }, { status: 429 });
  const spec = exportSpec(module, q); if (!spec) return Response.json({ code: "NOT_AVAILABLE" }, { status: 404 });
  const count = await query<{ count: string }>(`SELECT count(*)::text AS count FROM ${spec.table} WHERE ${spec.where}`, spec.params);
  const total = Number(count.rows[0]?.count || 0);
  const created = await query<{ id: string }>("INSERT INTO export_jobs(module,status,query_text,total_count,created_by) VALUES($1,'pending',$2,$3,$4) RETURNING id", [module, q, total, user.id]);
  const id = created.rows[0].id;
  await audit("export_queued", module, user.id, id, null, { query: Boolean(q), total });
  await runExportJobs(500, id);
  return Response.json({ jobId: id, total }, { status: 202 });
}
