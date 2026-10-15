import { can, getSession } from "@/lib/admin/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "sync", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const page = Math.max(1, Math.min(10000, Number(new URL(request.url).searchParams.get("page")) || 1));
  const rows = await query("SELECT id,source_id,status,attempt,max_attempts,run_after,started_at,finished_at,duration_ms,processed_count,error_code,created_at FROM sync_jobs ORDER BY created_at DESC LIMIT 30 OFFSET $1", [(page - 1) * 30]);
  return Response.json({ items: rows.rows, page });
}
