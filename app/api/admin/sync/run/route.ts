import { audit, can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { enqueueSource, runDueJobs, scheduleDueJobs } from "@/lib/admin/sync-engine";
import { queueDataSync } from "@/lib/admin/data-sync";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "sync", "sync")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({}));
    if (body.source === "ga4" || body.source === "search_console") await queueDataSync(body.source, true);
    else if (body.source) await enqueueSource(String(body.source));
    else await scheduleDueJobs();
    const results = await runDueJobs(5, body.source ? String(body.source) : undefined);
    await audit("run", "sync", user.id, String(body.source || "due"), null, { count: results.length });
    return Response.json({ results });
  } catch (error) { return Response.json({ code: "SYNC_FAILED", message: error instanceof Error ? error.message : "同步失败" }, { status: 500 }); }
}
