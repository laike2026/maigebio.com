import { query } from "@/lib/db";

export const runtime = "nodejs";
export async function GET() {
  try { await query("SELECT 1 AS ok"); return Response.json({ status: "ok", database: "ok" }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ status: "degraded", database: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
