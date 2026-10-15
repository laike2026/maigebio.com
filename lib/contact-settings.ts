import "server-only";
import { connection } from "next/server";
import { query } from "@/lib/db";
import { whatsappUrl } from "@/lib/site";

export type ContactSettings = { addressLabel: string; addressUrl: string; whatsappLabel: string; whatsappUrl: string };
export async function getContactSettings(): Promise<ContactSettings> {
  await connection();
  try {
    const rows = await query<{ value: Partial<ContactSettings> }>("SELECT value FROM system_settings WHERE key='tracking'");
    const value = rows.rows[0]?.value || {};
    return {
      addressLabel: value.addressLabel || "", addressUrl: value.addressUrl?.startsWith("https://") ? value.addressUrl : "",
      whatsappLabel: value.whatsappLabel || "WhatsApp", whatsappUrl: value.whatsappUrl?.startsWith("https://wa.me/") ? value.whatsappUrl : whatsappUrl,
    };
  } catch { return { addressLabel: "", addressUrl: "", whatsappLabel: "WhatsApp", whatsappUrl }; }
}
