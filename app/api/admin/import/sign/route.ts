import { randomUUID } from "node:crypto";
import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { templates } from "@/lib/admin/import-jobs";
import { s3Configured, signStagedMedia } from "@/lib/media-storage";
import { allowAdminRate } from "@/lib/admin/rate-limit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  if (!(await allowAdminRate("import-upload", user.id, 10))) return Response.json({ code: "RATE_LIMIT", message: "导入过于频繁，请稍后重试" }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const module = String(body?.module || ""); const filename = String(body?.filename || ""); const size = Number(body?.size);
  if (!templates[module] || !can(user, module, "create")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!s3Configured()) return Response.json({ code: "S3_NOT_CONFIGURED", message: "直传需要配置对象存储" }, { status: 503 });
  if (!/^[^/\\]{1,255}\.(csv|xlsx)$/i.test(filename) || !Number.isInteger(size) || size < 1 || size > 20 * 1024 * 1024) return Response.json({ code: "INVALID_FILE", message: "仅支持 20 MB 内的 CSV / XLSX" }, { status: 400 });
  const mime = filename.toLowerCase().endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const key = `staging/imports/${user.id}/${randomUUID()}.${filename.toLowerCase().endsWith(".csv") ? "csv" : "xlsx"}`;
  try { return Response.json({ key, url: await signStagedMedia(key, mime), contentType: mime }); }
  catch { return Response.json({ code: "SIGN_FAILED", message: "无法生成上传链接" }, { status: 503 }); }
}
