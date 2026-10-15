import { randomUUID } from "node:crypto";
import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { readImportRows, templates } from "@/lib/admin/import-jobs";
import { query } from "@/lib/db";
import { getStagedMedia } from "@/lib/media-storage";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const module = String(body?.module || ""); const filename = String(body?.filename || ""); const key = String(body?.key || ""); const preview = body?.preview === true;
  if (!templates[module] || !can(user, module, "create")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!key.startsWith(`staging/imports/${user.id}/`) || !/^[^/\\]{1,255}\.(csv|xlsx)$/i.test(filename)) return Response.json({ code: "INVALID_FILE" }, { status: 400 });
  try {
    const bytes = Buffer.from(await getStagedMedia(key));
    const rows = await readImportRows(filename, bytes, module);
    if (preview) return Response.json({ total: rows.length, columns: templates[module], rows: rows.slice(0, 20) });
    const id = randomUUID();
    await query("INSERT INTO import_jobs(id,module,status,filename,source_key,total_count,created_by) VALUES($1,$2,'pending',$3,$4,$5,$6)", [id, module, filename.slice(0, 255), key, rows.length, user.id]);
    return Response.json({ jobId: id, status: "pending", total: rows.length }, { status: 202 });
  } catch (error) { return Response.json({ code: "INVALID_FILE", message: error instanceof Error ? error.message : "文件读取失败" }, { status: 400 }); }
}
