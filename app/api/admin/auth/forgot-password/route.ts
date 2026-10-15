import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { requestOriginAllowed, tokenHash } from "@/lib/admin/auth";
import { query } from "@/lib/db";

const schema = z.object({ identifier: z.string().trim().min(1).max(254) });

export async function POST(request: Request) {
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_IDENTIFIER", message: "请输入账号或邮箱" }, { status: 400 });
  const identifier = parsed.data.identifier.toLowerCase();
  const user = await query<{ id: string; email: string }>("SELECT id,email FROM users WHERE (lower(email)=$1 OR lower(username)=$1) AND active=true AND deleted_at IS NULL LIMIT 1", [identifier]);
  if (user.rows[0]) {
    const recent = await query<{ count: number }>("SELECT count(*)::int AS count FROM password_resets WHERE user_id=$1 AND created_at>now()-interval '15 minutes'", [user.rows[0].id]);
    if ((recent.rows[0]?.count || 0) < 2 && process.env.RESEND_API_KEY) {
      const token = randomBytes(32).toString("base64url");
      await query("INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')", [user.rows[0].id, tokenHash(token)]);
      const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/admin/reset-password?token=${encodeURIComponent(token)}`;
      const resend = new Resend(process.env.RESEND_API_KEY);
      try { const sent = await resend.emails.send({ from: process.env.INQUIRY_FROM_EMAIL || "MAIGE Website <inquiries@maigebio.com>", to: [user.rows[0].email], subject: "MAIGE 管理后台重置密码", text: `请在 1 小时内使用此链接重置密码：${resetUrl}\n如非本人申请，请忽略此邮件。` }); if (sent.error) console.error("Admin reset email failed", sent.error.name); }
      catch { console.error("Admin reset email failed"); }
    }
  }
  return Response.json({ ok: true, message: "如果该账户存在，重置邮件将发送到邮箱。" });
}
