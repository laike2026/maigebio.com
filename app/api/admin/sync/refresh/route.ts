import { getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { dataSyncProgress, queueDataSync, type DataSource } from "@/lib/admin/data-sync";
import { runDueJobs } from "@/lib/admin/sync-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  return Response.json({ progress: await dataSyncProgress() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  try {
    const results = [];
    for (const source of ["ga4", "search_console"] as DataSource[]) {
      await queueDataSync(source, true);
      results.push(...await runDueJobs(1, source));
    }
    return Response.json({ results, progress: await dataSyncProgress() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ code: "SYNC_FAILED", message: error instanceof Error ? error.message : "同步暂不可用" }, { status: 503 });
  }
}
