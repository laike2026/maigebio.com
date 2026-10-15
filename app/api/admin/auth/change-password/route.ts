import { z } from "zod";
import { audit, getSession, hashPassword, requestOriginAllowed, revokeSession, verifyPassword } from "@/lib/admin/auth";
import { query } from "@/lib/db";

const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(14).max(500) });

export async function POST(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_PASSWORD", message: "新密码至少 14 位" }, { status: 400 });
  const found = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=$1", [user.id]);
  if (!found.rows[0] || !(await verifyPassword(parsed.data.currentPassword, found.rows[0].password_hash))) return Response.json({ code: "WRONG_PASSWORD", message: "当前密码错误" }, { status: 400 });
  const hash = await hashPassword(parsed.data.newPassword);
  await query("UPDATE users SET password_hash=$2,must_change_password=false,updated_at=now() WHERE id=$1", [user.id, hash]);
  await query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [user.id]);
  await audit("change_password", "auth", user.id);
  await revokeSession();
  return Response.json({ ok: true });
}
