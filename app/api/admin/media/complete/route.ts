import { z } from "zod";
import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { ingestMedia } from "@/lib/media-ingest";
import { deleteStagedMedia, getStagedMedia } from "@/lib/media-storage";

export const runtime = "nodejs";
const schema = z.object({ key: z.string().regex(/^staging\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/), name: z.string().min(1).max(255), size: z.number().int().min(1).max(20 * 1024 * 1024) });
export async function POST(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "media", "create")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.key.startsWith(`staging/${user.id}/`)) return Response.json({ code: "INVALID_KEY" }, { status: 400 });
  try {
    const bytes = await getStagedMedia(parsed.data.key);
    if (bytes.length !== parsed.data.size) return Response.json({ code: "SIZE_MISMATCH" }, { status: 400 });
    const result = await ingestMedia(parsed.data.name, Buffer.from(bytes), user);
    await deleteStagedMedia(parsed.data.key);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json({ code: "UPLOAD_FAILED", message: error instanceof Error && error.message === "UNSUPPORTED_FILE" ? "文件签名与扩展名不匹配" : "文件处理失败" }, { status: 400 });
  }
}
