import { z } from "zod";
import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { errorResponse, updateRecord } from "@/lib/admin/records";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "news", "publish")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ code: "INVALID_ID" }, { status: 400 });
  const parsed = z.object({ expectedVersion: z.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_BODY" }, { status: 400 });
  try {
    return Response.json(await updateRecord("news", id, { status: "published", expectedVersion: parsed.data.expectedVersion }, user, { allowNewsPublish: true }));
  } catch (error) { return errorResponse(error); }
}
