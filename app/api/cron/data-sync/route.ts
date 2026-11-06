import { dataSyncProgress, queueDataSync, type DataSource } from "@/lib/admin/data-sync";
import { runDueJobs } from "@/lib/admin/sync-engine";
import { cronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const started = Date.now();
  const results = [];
  for (const source of ["ga4", "search_console"] as DataSource[]) {
    const before = (await dataSyncProgress()).find((item) => item.source === source);
    const last = before?.lastSuccessAt ? new Date(before.lastSuccessAt).getTime() : 0;
    if (!before?.enabled || (!before.error && before.pendingDays <= 3 && Date.now() - last < 72 * 60 * 60_000)) continue;
    for (let batch = 0; batch < 6 && Date.now() - started < 45_000; batch++) {
      await queueDataSync(source, true);
      const outcome = await runDueJobs(1, source, true);
      results.push(...outcome);
      if (outcome[0]?.status !== "succeeded") break;
      const progress = (await dataSyncProgress()).find((item) => item.source === source);
      if (!progress?.pendingDays) break;
    }
  }
  return Response.json({ results, progress: await dataSyncProgress() });
}
