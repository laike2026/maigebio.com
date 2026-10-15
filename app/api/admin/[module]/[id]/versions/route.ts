import { z } from "zod";
import { audit, can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/definitions";
import { errorResponse, updateRecord } from "@/lib/admin/records";
import { query } from "@/lib/db";

export const runtime = "nodejs";
type Params = { params: Promise<{ module: string; id: string }> };
export async function GET(_request: Request, context: Params) {
  const { module, id } = await context.params;
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!["products", "news"].includes(module) || !can(user, module, "view") || !z.uuid().safeParse(id).success) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const rows = await query("SELECT id,version,created_at,created_by FROM content_versions WHERE module=$1 AND object_id=$2 ORDER BY version DESC LIMIT 50", [module, id]);
  return Response.json({ items: rows.rows });
}
export async function POST(request: Request, context: Params) {
  const { module, id } = await context.params;
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!["products", "news"].includes(module) || !can(user, module, "update") || !z.uuid().safeParse(id).success) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const parsed = z.object({ version: z.number().int().positive(), expectedVersion: z.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_BODY" }, { status: 400 });
  const history = await query<{ snapshot: Record<string, unknown> }>("SELECT snapshot FROM content_versions WHERE module=$1 AND object_id=$2 AND version=$3", [module, id, parsed.data.version]);
  if (!history.rows[0]) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  const snapshot = history.rows[0].snapshot;
  const values = Object.fromEntries(modules[module].fields.filter((field) => field.key !== "id" && field.key in snapshot).map((field) => [field.key, snapshot[field.key]]));
  try {
    const restored = await updateRecord(module, id, { ...values, expectedVersion: parsed.data.expectedVersion }, user);
    await audit("restore_version", module, user.id, id, { version: parsed.data.version }, { version: restored.version });
    return Response.json(restored);
  } catch (error) { return errorResponse(error); }
}
