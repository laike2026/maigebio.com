import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { deleteRecord, errorResponse, getRecord, restoreRecord, updateRecord } from "@/lib/admin/records";

export const runtime = "nodejs";
type Params = { params: Promise<{ module: string; id: string }> };

export async function GET(_request: Request, context: Params) {
  const { module, id } = await context.params;
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED", message: "请先登录" }, { status: 401 });
  if (!can(user, module, "view")) return Response.json({ code: "FORBIDDEN", message: "没有查看权限" }, { status: 403 });
  try { return Response.json(await getRecord(module, id)); }
  catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: Params) {
  const { module, id } = await context.params;
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED", message: "请先登录" }, { status: 401 });
  if (!can(user, module, "update")) return Response.json({ code: "FORBIDDEN", message: "没有编辑权限" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN", message: "请求来源无效" }, { status: 403 });
  try { return Response.json(await updateRecord(module, id, await request.json(), user)); }
  catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, context: Params) {
  const { module, id } = await context.params;
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED", message: "请先登录" }, { status: 401 });
  if (!can(user, module, "delete")) return Response.json({ code: "FORBIDDEN", message: "没有删除权限" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN", message: "请求来源无效" }, { status: 403 });
  try { return Response.json(await deleteRecord(module, id, user)); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: Params) {
  const { module, id } = await context.params;
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED", message: "请先登录" }, { status: 401 });
  if (!can(user, module, "update")) return Response.json({ code: "FORBIDDEN", message: "没有恢复权限" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN", message: "请求来源无效" }, { status: 403 });
  try { return Response.json(await restoreRecord(module, id, user)); }
  catch (error) { return errorResponse(error); }
}
