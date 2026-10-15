import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, normalize } from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function s3(endpointOverride?: string) {
  if (!process.env.S3_BUCKET || !process.env.S3_REGION || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    if (process.env.NODE_ENV === "production") throw new Error("S3 storage is not configured");
    return null;
  }
  return new S3Client({
    region: process.env.S3_REGION,
    endpoint: endpointOverride || process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(endpointOverride || process.env.S3_ENDPOINT),
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  });
}

export function s3Configured() { return Boolean(process.env.S3_BUCKET && process.env.S3_REGION && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY); }

export async function signStagedMedia(key: string, contentType: string) {
  safeKey(key);
  if (!key.startsWith("staging/")) throw new Error("Invalid staged key");
  const client = s3(process.env.S3_PUBLIC_ENDPOINT); if (!client) throw new Error("S3_NOT_CONFIGURED");
  return getSignedUrl(client, new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, ContentType: contentType }), { expiresIn: 300 });
}

export async function getStagedMedia(key: string) {
  safeKey(key); if (!key.startsWith("staging/")) throw new Error("Invalid staged key");
  const client = s3(); if (!client) throw new Error("S3_NOT_CONFIGURED");
  const response = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
  if (!response.Body || (response.ContentLength || 0) > 20 * 1024 * 1024) throw new Error("Invalid staged object");
  const bytes = await response.Body.transformToByteArray();
  if (bytes.length > 20 * 1024 * 1024) throw new Error("Invalid staged object");
  return bytes;
}

export async function deleteStagedMedia(key: string) {
  safeKey(key); if (!key.startsWith("staging/")) throw new Error("Invalid staged key");
  const client = s3(); if (client) await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
}

function safeKey(key: string) {
  if (!/^[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/.test(key) || normalize(key).startsWith("..")) throw new Error("Invalid storage key");
  return key;
}

export async function putMedia(key: string, bytes: Uint8Array, contentType: string) {
  safeKey(key);
  const client = s3();
  if (client) {
    await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: bytes, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
    return;
  }
  const path = join(process.env.MAIGE_DATA_DIR || join(process.cwd(), ".data"), "media", key);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
}

export async function getMedia(key: string) {
  safeKey(key);
  const client = s3();
  if (client) {
    const response = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
    return response.Body?.transformToByteArray() || new Uint8Array();
  }
  return readFile(join(process.env.MAIGE_DATA_DIR || join(process.cwd(), ".data"), "media", key));
}

export async function removeMedia(key: string) {
  safeKey(key);
  const client = s3();
  if (client) { await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key })); return; }
  await unlink(join(process.env.MAIGE_DATA_DIR || join(process.cwd(), ".data"), "media", key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
}
