import { timingSafeEqual } from "node:crypto";
import { query } from "@/lib/db";
import { runDueJobs } from "@/lib/admin/sync-engine";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!secret || secret.length < 24 || supplied.length !== secret.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) return Response.json({ code: "FORBIDDEN" }, { status: 403 });

  const now = new Date();
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  if (shanghai.getUTCDay() !== 1) return Response.json({ code: "NOT_MONDAY" }, { status: 409 });
  const monday = shanghai.toISOString().slice(0, 10);
  const source = await query<{ enabled: boolean }>("SELECT enabled FROM sync_sources WHERE id='google_sitemap'");
  if (!source.rows[0]?.enabled) return Response.json({ queued: false, results: [] });
  const queued = await query<{ id: string }>(
    "INSERT INTO sync_jobs(source_id,idempotency_key) VALUES('google_sitemap',$1) ON CONFLICT DO NOTHING RETURNING id",
    [`google_sitemap:${monday}`],
  );
  await query("UPDATE sync_sources SET next_run_at=$1,updated_at=now() WHERE id='google_sitemap'", [new Date(Date.parse(`${monday}T01:00:00Z`) + 7 * 24 * 60 * 60 * 1000).toISOString()]);
  const results = await runDueJobs(1, "google_sitemap");
  return Response.json({ queued: Boolean(queued.rowCount), results });
}
