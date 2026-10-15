import { cookies } from "next/headers";
import { z } from "zod";
import { audit, getSession, requestOriginAllowed, tokenHash } from "@/lib/admin/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export async function GET() {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const current = (await cookies()).get("maige_admin_session")?.value;
  const rows = await query<{ id: string; token_hash: string; ip: string; user_agent: string; created_at: string; last_seen_at: string; expires_at: string }>(
    "SELECT id,token_hash,ip,user_agent,created_at,last_seen_at,expires_at FROM sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 50", [user.id]);
  return Response.json({ items: rows.rows.map(({ token_hash, ...row }) => ({ ...row, current: Boolean(current && tokenHash(current) === token_hash) })) });
}
export async function DELETE(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const parsed = z.object({ id: z.uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  await query("UPDATE sessions SET revoked_at=now() WHERE id=$1 AND user_id=$2", [parsed.data.id, user.id]);
  await audit("revoke_session", "auth", user.id, parsed.data.id);
  return Response.json({ ok: true });
}
