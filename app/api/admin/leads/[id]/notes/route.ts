import { z } from "zod";
import { audit, can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Params) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "leads", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const rows = await query("SELECT n.id,n.body,n.created_at,u.display_name FROM lead_notes n JOIN users u ON u.id=n.author_id WHERE n.submission_id=$1 ORDER BY n.created_at DESC LIMIT 100", [id]);
  return Response.json({ items: rows.rows });
}

export async function POST(request: Request, context: Params) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "leads", "update")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = z.object({ body: z.string().trim().min(1).max(4000) }).safeParse(body);
  if (!z.uuid().safeParse(id).success || !parsed.success) return Response.json({ code: "INVALID_BODY", message: "备注不能为空且不能超过 4000 字" }, { status: 400 });
  const exists = await query("SELECT id FROM form_submissions WHERE id=$1 AND deleted_at IS NULL", [id]);
  if (!exists.rows.length) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  const inserted = await query("INSERT INTO lead_notes(submission_id,author_id,body) VALUES($1,$2,$3) RETURNING id,body,created_at", [id, user.id, parsed.data.body]);
  await audit("note", "leads", user.id, id, null, { noteId: inserted.rows[0].id });
  return Response.json(inserted.rows[0], { status: 201 });
}
