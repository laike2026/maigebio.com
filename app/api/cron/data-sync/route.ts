import { timingSafeEqual } from "node:crypto";
import { dataSyncProgress, queueDataSync, type DataSource } from "@/lib/admin/data-sync";
import { runDueJobs } from "@/lib/admin/sync-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!secret || secret.length < 24 || supplied.length !== secret.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const started = Date.now();
  const results = [];
  for (const source of ["ga4", "search_console"] as DataSource[]) {
    const before = (await dataSyncProgress()).find((item) => item.source === source);
    const last = before?.lastSuccessAt ? new Date(before.lastSuccessAt).getTime() : 0;
    if (!before?.enabled || !before.pendingDays || (before.pendingDays <= 3 && Date.now() - last < 72 * 60 * 60_000)) continue;
    for (let batch = 0; batch < 6 && Date.now() - started < 45_000; batch++) {
      const queued = await queueDataSync(source, true);
      const outcome = await runDueJobs(1, source);
      results.push(...outcome);
      if (!queued || outcome[0]?.status !== "succeeded") break;
      const progress = (await dataSyncProgress()).find((item) => item.source === source);
      if (!progress?.pendingDays) break;
    }
  }
  return Response.json({ results, progress: await dataSyncProgress() });
}
