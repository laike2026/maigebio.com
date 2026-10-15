import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { audit, createSession, requestOriginAllowed, verifyPassword } from "@/lib/admin/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
const schema = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(500), remember: z.boolean().optional() });
type LoginUser = { id: string; email: string; password_hash: string; locked_until: Date | null; active: boolean };

export async function POST(request: Request) {
  if (!(await requestOriginAllowed(request))) return NextResponse.json({ code: "BAD_ORIGIN", message: "请求来源无效" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: "INVALID_INPUT", message: "请输入有效的账号和密码" }, { status: 400 });
  const identifier = parsed.data.identifier.toLowerCase();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const found = await query<LoginUser>("SELECT id,email,password_hash,locked_until,active FROM users WHERE (lower(email)=$1 OR lower(username)=$1) AND deleted_at IS NULL LIMIT 1", [identifier]);
  const user = found.rows[0];
  const attemptKey = user?.email.toLowerCase() || identifier;
  const recent = await query<{ count: number }>("SELECT count(*)::int AS count FROM login_attempts WHERE email=$1 AND success=false AND created_at>now()-interval '15 minutes'", [attemptKey]);
  if ((recent.rows[0]?.count || 0) >= 10) return NextResponse.json({ code: "LOCKED", message: "尝试次数过多，请 15 分钟后重试" }, { status: 429 });
  const valid = user && user.active && (!user.locked_until || new Date(user.locked_until) < new Date()) && await verifyPassword(parsed.data.password, user.password_hash);
  await query("INSERT INTO login_attempts(email,ip,success) VALUES($1,$2,$3)", [attemptKey, ip.slice(0, 80), Boolean(valid)]);
  if (!valid) {
    if (user && (recent.rows[0]?.count || 0) >= 4) await query("UPDATE users SET locked_until=now()+interval '15 minutes' WHERE id=$1", [user.id]);
    await audit("login_failed", "auth", user?.id || null, identifier, null, null, false);
    return NextResponse.json({ code: "INVALID_CREDENTIALS", message: "账号或密码错误" }, { status: 401 });
  }
  await query("UPDATE users SET last_login_at=now(),last_login_ip=$2,locked_until=NULL WHERE id=$1", [user.id, ip.slice(0, 80)]);
  await createSession(user.id, Boolean(parsed.data.remember), ip, h.get("user-agent") || "");
  await audit("login", "auth", user.id);
  const status = await query<{ must_change_password: boolean }>("SELECT must_change_password FROM users WHERE id=$1", [user.id]);
  return NextResponse.json({ ok: true, redirect: status.rows[0]?.must_change_password ? "/admin/change-password" : "/admin" });
}
