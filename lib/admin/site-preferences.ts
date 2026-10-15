import "server-only";
import { query } from "@/lib/db";

export async function sitePreferences() {
  const rows = await query<{ value: { timezone?: string; dateFormat?: string; pageSize?: number } }>("SELECT value FROM system_settings WHERE key='site'");
  const value = rows.rows[0]?.value || {};
  return { timezone: value.timezone || "Asia/Shanghai", dateFormat: value.dateFormat || "yyyy-MM-dd", pageSize: value.pageSize || 20 };
}
