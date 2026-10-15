import { audit, can, getSession } from "@/lib/admin/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const found = await query<{ module: string; status: string; created_by: string }>("SELECT module,status,created_by FROM export_jobs WHERE id=$1", [id]);
  const job = found.rows[0]; if (!job) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  if (job.created_by !== user.id || !can(user, job.module, "export")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (job.status !== "succeeded") return Response.json({ code: "NOT_READY" }, { status: 409 });
  await audit("export_download", job.module, user.id, id);
  const encoder = new TextEncoder();
  let sequence = -1;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunks = await query<{ sequence: number; csv_text: string }>("SELECT sequence,csv_text FROM export_job_chunks WHERE job_id=$1 AND sequence>$2 ORDER BY sequence LIMIT 10", [id, sequence]);
        if (!chunks.rows.length) { controller.close(); return; }
        for (const chunk of chunks.rows) { controller.enqueue(encoder.encode(chunk.csv_text)); sequence = chunk.sequence; }
      } catch (error) { controller.error(error); }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="maige-${job.module}-${new Date().toISOString().slice(0,10)}.csv"`, "Cache-Control": "no-store" } });
}
