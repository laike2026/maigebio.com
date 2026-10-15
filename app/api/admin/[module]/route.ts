import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { createRecord, errorResponse, listRecords } from "@/lib/admin/records";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ module: string }> }) {
  const { module } = await context.params;
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED", message: "请先登录" }, { status: 401 });
  if (!can(user, module, "view")) return Response.json({ code: "FORBIDDEN", message: "没有查看权限" }, { status: 403 });
  try { return Response.json(await listRecords(module, new URL(request.url).searchParams)); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ module: string }> }) {
  const { module } = await context.params;
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED", message: "请先登录" }, { status: 401 });
  if (!can(user, module, "create")) return Response.json({ code: "FORBIDDEN", message: "没有新增权限" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN", message: "请求来源无效" }, { status: 403 });
  try { return Response.json(await createRecord(module, await request.json(), user), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
