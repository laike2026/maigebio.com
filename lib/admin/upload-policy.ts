import "server-only";
import { query } from "@/lib/db";

export async function getUploadPolicy() {
  const fallback = { maxBytes: 10 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] };
  try {
    const rows = await query<{ value: Partial<typeof fallback> }>("SELECT value FROM system_settings WHERE key='upload'");
    return { ...fallback, ...(rows.rows[0]?.value || {}) };
  } catch { return fallback; }
}
