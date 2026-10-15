import "server-only";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { audit, type AdminUser } from "@/lib/admin/auth";
import { query } from "@/lib/db";
import { putMedia } from "@/lib/media-storage";
import { getUploadPolicy } from "@/lib/admin/upload-policy";

export function fileKind(name: string, bytes: Buffer) {
  const lower = name.toLowerCase();
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) && /\.jpe?g$/.test(lower)) return { kind: "image", mime: "image/jpeg", ext: "webp" };
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && lower.endsWith(".png")) return { kind: "image", mime: "image/png", ext: "webp" };
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" && lower.endsWith(".webp")) return { kind: "image", mime: "image/webp", ext: "webp" };
  if (bytes.toString("ascii", 0, 4) === "%PDF" && lower.endsWith(".pdf")) return { kind: "document", mime: "application/pdf", ext: "pdf" };
  if (bytes.toString("ascii", 0, 2) === "PK" && lower.endsWith(".docx")) return { kind: "document", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" };
  if (bytes.toString("ascii", 0, 2) === "PK" && lower.endsWith(".xlsx")) return { kind: "document", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" };
  if (lower.endsWith(".svg")) {
    const source = bytes.toString("utf8");
    if (source.length <= 1_000_000 && /<svg[\s>]/i.test(source) && !/<!DOCTYPE|<!ENTITY|<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=|url\s*\(/i.test(source)) return { kind: "image", mime: "image/svg+xml", ext: "webp" };
  }
  return null;
}

export async function ingestMedia(name: string, bytes: Buffer, user: AdminUser) {
  const type = fileKind(name, bytes);
  if (!type) throw new Error("UNSUPPORTED_FILE");
  const policy = await getUploadPolicy();
  if (bytes.length > policy.maxBytes) throw new Error("FILE_TOO_LARGE");
  if (!policy.allowedTypes.includes(type.mime)) throw new Error("FILE_TYPE_DISABLED");
  const sha = createHash("sha256").update(bytes).digest("hex");
  const existing = await query<{ id: string; url: string }>("SELECT id,url FROM media_assets WHERE sha256=$1 AND deleted_at IS NULL LIMIT 1", [sha]);
  if (existing.rows[0]) return { ...existing.rows[0], duplicate: true };
  let upload: Uint8Array = bytes;
  let thumb: Uint8Array | null = null;
  let mime = type.mime;
  let width: number | null = null;
  let height: number | null = null;
  if (type.kind === "image") {
    const image = sharp(bytes, { limitInputPixels: 50_000_000 });
    const metadata = await image.metadata();
    width = metadata.width || null; height = metadata.height || null;
    upload = await image.rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 83 }).toBuffer();
    thumb = await sharp(upload).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    mime = "image/webp";
  }
  const id = randomUUID();
  const key = `uploads/${id}.${type.ext}`;
  const thumbKey = thumb ? `uploads/${id}-thumb.webp` : null;
  await putMedia(key, upload, mime);
  if (thumb && thumbKey) await putMedia(thumbKey, thumb, "image/webp");
  const url = `/api/media/${id}`;
  const inserted = await query<{ id: string; url: string }>(
    "INSERT INTO media_assets(id,object_key,thumbnail_key,url,original_name,mime_type,size_bytes,sha256,kind,width,height,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id,url",
    [id, key, thumbKey, url, name.slice(0, 255), mime, upload.length, sha, type.kind, width, height, user.id]);
  await audit("upload", "media", user.id, id, null, { mime, size: upload.length });
  return inserted.rows[0];
}
