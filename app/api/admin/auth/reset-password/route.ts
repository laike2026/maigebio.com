import { z } from "zod";
import { audit, hashPassword, requestOriginAllowed, tokenHash } from "@/lib/admin/auth";
import { transaction } from "@/lib/db";

const schema = z.object({ token: z.string().min(32).max(200), newPassword: z.string().min(8).max(500) });

export async function POST(request: Request) {
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_INPUT", message: "链接或密码无效" }, { status: 400 });
  const hash = await hashPassword(parsed.data.newPassword);
  const resetHash = tokenHash(parsed.data.token);
  const userId = await transaction(async (tx) => {
    const result = await tx.query<{ id: string; user_id: string }>("SELECT id,user_id FROM password_resets WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE", [resetHash]);
    if (!result.rows[0]) return null;
    await tx.query("UPDATE password_resets SET used_at=now() WHERE id=$1", [result.rows[0].id]);
    await tx.query("UPDATE users SET password_hash=$2,must_change_password=false,updated_at=now() WHERE id=$1", [result.rows[0].user_id, hash]);
    await tx.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [result.rows[0].user_id]);
    return result.rows[0].user_id;
  });
  if (!userId) return Response.json({ code: "INVALID_TOKEN", message: "链接无效或已过期" }, { status: 400 });
  await audit("reset_password", "auth", userId);
  return Response.json({ ok: true });
}
