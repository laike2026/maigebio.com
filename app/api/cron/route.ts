import { runDueJobs, scheduleDueJobs } from "@/lib/admin/sync-engine";
import { runImportJobs } from "@/lib/admin/import-jobs";
import { runExportJobs } from "@/lib/admin/export-jobs";
import { cronAuthorized } from "@/lib/cron-auth";
import { runSiteHealth } from "@/lib/admin/site-health";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const started = Date.now();
  const queued = await scheduleDueJobs();
  const results = [];
  for (const source of ["email_retry", "seo_audit", "retention_cleanup"]) results.push(...await runDueJobs(4, source, true));
  results.push(...await runDueJobs(1, "google_sitemap", true));
  const importJob = await runImportJobs(100);
  const exportJob = await runExportJobs(500);
  const health = Date.now() - started < 42_000 ? await runSiteHealth(true).catch((error: unknown) => {
    console.error("MAIGE site health unavailable", error instanceof Error ? error.name : "unknown");
    return null;
  }) : null;
  return Response.json({ queued, results, importJob, exportJob, health: health?.checkedAt ?? null });
}
