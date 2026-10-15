import { NextResponse } from "next/server";
import { audit, getSession, requestOriginAllowed, revokeSession } from "@/lib/admin/auth";

export async function POST(request: Request) {
  if (!(await requestOriginAllowed(request))) return NextResponse.json({ code: "BAD_ORIGIN", message: "请求来源无效" }, { status: 403 });
  const user = await getSession();
  if (user) await audit("logout", "auth", user.id);
  await revokeSession();
  return NextResponse.json({ ok: true });
}
