import { z } from "zod";
import { audit, requestOriginAllowed, tokenHash } from "@/lib/admin/auth";
import { isUniqueViolation, transaction } from "@/lib/db";

export const runtime = "nodejs";
const schema = z.object({ token: z.string().min(32).max(200) });

export async function POST(request: Request) {
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_TOKEN", message: "验证链接无效" }, { status: 400 });
  try {
    const changed = await transaction(async (tx) => {
      const found = await tx.query<{ id: string; email: string; pending_email: string }>("SELECT id,email,pending_email FROM users WHERE email_change_token_hash=$1 AND email_change_expires_at>now() AND pending_email IS NOT NULL FOR UPDATE", [tokenHash(parsed.data.token)]);
      const user = found.rows[0];
      if (!user) return null;
      await tx.query("UPDATE users SET email=pending_email,pending_email=NULL,email_change_token_hash=NULL,email_change_expires_at=NULL,updated_at=now() WHERE id=$1", [user.id]);
      await tx.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [user.id]);
      return user;
    });
    if (!changed) return Response.json({ code: "INVALID_TOKEN", message: "链接无效或已过期" }, { status: 400 });
    await audit("verify_email_change", "auth", changed.id, changed.id, { email: changed.email }, { email: changed.pending_email });
    return Response.json({ ok: true });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ code: "DUPLICATE_EMAIL", message: "新邮箱已被使用" }, { status: 409 });
    throw error;
  }
}
