import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { runImportJobs } from "@/lib/admin/import-jobs";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const result = await query<{ id: string; module: string; status: string; total_count: number; processed_count: number; success_count: number; failure_count: number; error_report: { row: number; message: string }[]; created_by: string }>(
    "SELECT id,module,status,total_count,processed_count,success_count,failure_count,error_report,created_by FROM import_jobs WHERE id=$1", [id]);
  const job = result.rows[0]; if (!job) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  if (job.created_by !== user.id && !can(user, "sync", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  return Response.json({ jobId: job.id, module: job.module, status: job.status, total: job.total_count, processed: job.processed_count, success: job.success_count, failed: job.failure_count, errors: job.error_report || [] });
}

export async function POST(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const { id } = await request.json().catch(() => ({}));
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const result = await query<{ module: string; created_by: string }>("SELECT module,created_by FROM import_jobs WHERE id=$1", [id]);
  const job = result.rows[0]; if (!job) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  if (job.created_by !== user.id && !can(user, "sync", "sync")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!can(user, job.module, "create") && !can(user, "sync", "sync")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const outcome = await runImportJobs(25, id);
  return Response.json({ outcome });
}
