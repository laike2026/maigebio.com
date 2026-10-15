import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { isLocale } from "@/lib/site";

export default async function RootPage() {
  let locale = "en";
  try { const rows = await query<{ value: { defaultLocale?: string } }>("SELECT value FROM system_settings WHERE key='site'"); const configured = rows.rows[0]?.value?.defaultLocale; if (configured && isLocale(configured)) locale = configured; }
  catch { /* English remains available when the content store is temporarily unavailable. */ }
  redirect(`/${locale}`);
}
