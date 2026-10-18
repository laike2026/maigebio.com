import { timingSafeEqual } from "node:crypto";
import { runDueJobs, scheduleDueJobs } from "@/lib/admin/sync-engine";
import { runImportJobs } from "@/lib/admin/import-jobs";
import { runExportJobs } from "@/lib/admin/export-jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!secret || secret.length < 24 || supplied.length !== secret.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const queued = await scheduleDueJobs();
  const results = [];
  for (const source of ["email_retry", "seo_audit", "retention_cleanup"]) results.push(...await runDueJobs(4, source));
  const importJob = await runImportJobs(100);
  const exportJob = await runExportJobs(500);
  return Response.json({ queued, results, importJob, exportJob });
}
