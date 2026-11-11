import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { AdminError, errorResponse } from "@/lib/admin/records";
import { query, transaction } from "@/lib/db";

export const runtime = "nodejs";

// Require both an explicit test name and a reserved example domain.
const testPredicate = `name ~* '(^|[^a-z0-9])(qa|e2e|test)([^a-z0-9]|$)|^测试'
  AND lower(btrim(email)) ~ '@example\\.(com|org|net|invalid)$'`;
const cleanupInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  confirmation: z.literal("DELETE_TEST_INQUIRIES"),
}).strict();
const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (user.role_id !== "superadmin" || !can(user, "leads", "delete")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  try {
    const result = await query<{ id: string }>(`SELECT id FROM form_submissions WHERE ${testPredicate} ORDER BY id LIMIT 100`);
    return Response.json({ ids: result.rows.map((row) => row.id), count: result.rows.length }, { headers: noStore });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (user.role_id !== "superadmin" || !can(user, "leads", "delete")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  try {
    const input = cleanupInput.safeParse(await request.json().catch(() => null));
    if (!input.success) throw new AdminError("INVALID_CLEANUP", "请选择测试询盘并确认清理", 400);
    const ids = [...new Set(input.data.ids)];
    const deleted = await transaction(async (tx) => {
      const selected = await tx.query<{ id: string; test_data: boolean }>(
        `SELECT id,(${testPredicate}) AS test_data FROM form_submissions WHERE id=ANY($1::uuid[]) FOR UPDATE`, [ids]);
      if (selected.rows.some((row) => !row.test_data)) throw new AdminError("NOT_TEST_DATA", "选中记录包含正式询盘，未执行清理", 409);
      const found = selected.rows.map((row) => row.id);
      if (!found.length) return [];
      const references = await tx.query(
        "SELECT id FROM form_submissions WHERE duplicate_of=ANY($1::uuid[]) AND NOT(id=ANY($1::uuid[])) LIMIT 1", [found]);
      if (references.rows.length) throw new AdminError("INQUIRY_REFERENCED", "记录被其他询盘引用，未执行清理", 409);
      await tx.query("UPDATE audit_logs SET before_summary=NULL,after_summary=NULL WHERE module='leads' AND object_id=ANY($1::text[])", [found]);
      // Related notes are removed by the submission foreign key's ON DELETE CASCADE.
      await tx.query("DELETE FROM form_submissions WHERE id=ANY($1::uuid[])", [found]);
      return found;
    });
    if (deleted.length) await audit("cleanup_test_inquiries", "leads", user.id, "", null, { deleted: deleted.length });
    for (const path of ["/admin", "/admin/leads", "/admin/analytics"]) revalidatePath(path);
    return Response.json({ ok: true, deleted: deleted.length, ids: deleted }, { headers: noStore });
  } catch (error) { return errorResponse(error); }
}
