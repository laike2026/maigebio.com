import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { ingestMedia } from "@/lib/media-ingest";
import { allowAdminRate } from "@/lib/admin/rate-limit";

export const runtime = "nodejs";
const maxSize = process.env.NODE_ENV === "production" ? 4 * 1024 * 1024 : 10 * 1024 * 1024;
export async function POST(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "media", "create")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  if (!(await allowAdminRate("media-upload", user.id, 30))) return Response.json({ code: "RATE_LIMIT", message: "上传过于频繁，请稍后重试" }, { status: 429 });
  if (Number(request.headers.get("content-length") || 0) > maxSize + 10_000) return Response.json({ code: "FILE_TOO_LARGE", message: "文件过大，请使用直传" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > maxSize) return Response.json({ code: "INVALID_FILE", message: "文件为空或过大" }, { status: 400 });
  try { return Response.json(await ingestMedia(file.name, Buffer.from(await file.arrayBuffer()), user), { status: 201 }); }
  catch (error) { return Response.json({ code: "UPLOAD_FAILED", message: error instanceof Error && error.message === "UNSUPPORTED_FILE" ? "不支持的文件格式或文件签名不匹配" : error instanceof Error && error.message === "FILE_TOO_LARGE" ? "文件超过后台设置的大小限制" : error instanceof Error && error.message === "FILE_TYPE_DISABLED" ? "此文件类型已在系统设置中禁用" : "上传失败，请重试" }, { status: 400 }); }
}
