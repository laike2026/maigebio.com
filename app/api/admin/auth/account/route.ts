import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { audit, getSession, requestOriginAllowed, tokenHash, verifyPassword } from "@/lib/admin/auth";
import { isUniqueViolation, query } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{2,31}$/).optional(),
  email: z.email().trim().toLowerCase().max(254).optional(),
  currentPassword: z.string().min(1).max(500),
}).refine((value) => Boolean(value.username || value.email));

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  return Response.json({ username: user.username, email: user.email, displayName: user.display_name });
}

export async function PATCH(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_INPUT", message: "请填写有效的账号或邮箱，并输入当前密码" }, { status: 400 });
  const current = await query<{ password_hash: string; email_change_requested_at: Date | null }>("SELECT password_hash,email_change_requested_at FROM users WHERE id=$1", [user.id]);
  if (!current.rows[0] || !(await verifyPassword(parsed.data.currentPassword, current.rows[0].password_hash))) return Response.json({ code: "WRONG_PASSWORD", message: "当前密码错误" }, { status: 400 });
  const next = parsed.data;
  if (next.email && next.email !== user.email.toLowerCase()) {
    if (!process.env.RESEND_API_KEY) return Response.json({ code: "EMAIL_UNAVAILABLE", message: "邮件服务尚未配置，请稍后重试" }, { status: 503 });
    const last = current.rows[0].email_change_requested_at;
    if (last && Date.now() - new Date(last).getTime() < 15 * 60_000) return Response.json({ code: "RATE_LIMITED", message: "请在 15 分钟后重试" }, { status: 429 });
    const taken = await query<{ id: string }>("SELECT id FROM users WHERE lower(email)=$1 AND id<>$2 AND deleted_at IS NULL LIMIT 1", [next.email, user.id]);
    if (taken.rows.length) return Response.json({ code: "DUPLICATE_EMAIL", message: "邮箱已被使用" }, { status: 409 });
  }
  if (next.username && next.username !== user.username) {
    try { await query("UPDATE users SET username=$2,updated_at=now() WHERE id=$1", [user.id, next.username]); }
    catch (error) { if (isUniqueViolation(error)) return Response.json({ code: "DUPLICATE_USERNAME", message: "账号名已被使用" }, { status: 409 }); throw error; }
    await audit("change_username", "auth", user.id, user.id, { username: user.username }, { username: next.username });
  }
  if (next.email && next.email !== user.email.toLowerCase()) {
    const token = randomBytes(32).toString("base64url");
    await query("UPDATE users SET pending_email=$2,email_change_token_hash=$3,email_change_expires_at=now()+interval '1 hour',email_change_requested_at=now() WHERE id=$1", [user.id, next.email, tokenHash(token)]);
    const url = `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/admin/verify-email?token=${encodeURIComponent(token)}`;
    const sent = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.INQUIRY_FROM_EMAIL || "MAIGE Website <inquiries@maigebio.com>", to: [next.email], subject: "确认 MAIGE 管理后台新邮箱", text: `请在 1 小时内打开链接确认新邮箱：${url}\n如非本人操作，请忽略。` }).catch(() => null);
    if (!sent || sent.error) {
      await query("UPDATE users SET pending_email=NULL,email_change_token_hash=NULL,email_change_expires_at=NULL,email_change_requested_at=NULL WHERE id=$1 AND email_change_token_hash=$2", [user.id, tokenHash(token)]);
      return Response.json({ code: "EMAIL_SEND_FAILED", message: "验证邮件发送失败，请稍后重试" }, { status: 502 });
    }
    await audit("request_email_change", "auth", user.id, user.id, null, { pendingEmail: next.email });
  }
  return Response.json({ ok: true, message: next.email && next.email !== user.email.toLowerCase() ? "账号已保存。验证邮件已发送到新邮箱，点击邮件链接后才会切换邮箱。" : "账号已保存。" });
}
