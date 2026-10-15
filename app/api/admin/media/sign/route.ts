import { randomUUID } from "node:crypto";
import { z } from "zod";
import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { directUploadConfigured, signStagedMedia } from "@/lib/media-storage";
import { allowAdminRate } from "@/lib/admin/rate-limit";

export const runtime = "nodejs";
const schema = z.object({ name: z.string().min(1).max(255).regex(/\.(jpe?g|png|webp|svg|pdf|docx|xlsx)$/i), size: z.number().int().min(1).max(20 * 1024 * 1024), type: z.string().max(120) });
export async function POST(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "media", "create")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  if (!(await allowAdminRate("media-upload", user.id, 30))) return Response.json({ code: "RATE_LIMIT", message: "上传过于频繁，请稍后重试" }, { status: 429 });
  if (!directUploadConfigured()) return Response.json({ code: "DIRECT_UPLOAD_UNAVAILABLE" }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_FILE", message: "文件格式或大小不符合要求" }, { status: 400 });
  const ext = parsed.data.name.split(".").pop()!.toLowerCase();
  const key = `staging/${user.id}/${randomUUID()}.${ext}`;
  const contentType = parsed.data.type || "application/octet-stream";
  try { return Response.json({ key, url: await signStagedMedia(key, contentType), contentType }); }
  catch { return Response.json({ code: "SIGN_FAILED", message: "无法创建上传链接" }, { status: 503 }); }
}
