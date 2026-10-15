import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { sitePreferences } from "@/lib/admin/site-preferences";

export const runtime = "nodejs";

const names = ["contact_address_click", "contact_whatsapp_click", "form_view", "form_start", "form_field_complete", "form_submit_attempt", "form_submit_success", "form_submit_failure"] as const;
const fields = ["name", "company", "email", "country", "product", "message", "consent", "phone"] as const;
const schema = z.object({
  eventName: z.enum(names), pagePath: z.string().max(500).regex(/^\/(?!\/)/),
  placement: z.string().max(80).regex(/^[a-z0-9_-]*$/).default(""),
  locale: z.enum(["en", "ar", "ru", "es"]).optional().default("en"),
  formId: z.string().max(80).regex(/^[a-z0-9_-]*$/).optional().default(""),
  productSlug: z.string().max(160).regex(/^[a-z0-9-]*$/).optional().default(""),
  fieldName: z.enum(fields).optional(),
  sessionId: z.uuid().optional(),
  eventKey: z.uuid(),
  consent: z.literal(true),
});
const devSalt = randomBytes(32).toString("hex");

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && ![request.headers.get("host"), request.headers.get("x-forwarded-host"), new URL(request.url).host].includes(new URL(origin).host)) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 2500) return Response.json({ code: "TOO_LARGE" }, { status: 413 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_EVENT" }, { status: 400 });
  const event = parsed.data;
  const preferences = await sitePreferences();
  const reportingDay = new Intl.DateTimeFormat("en-CA", { timeZone: preferences.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const sessionHash = event.sessionId ? createHash("sha256").update(`${process.env.ANALYTICS_HASH_SALT || devSalt}:${event.sessionId}`).digest("hex") : null;
  try {
    await transaction(async (tx) => {
    const inserted = await tx.query<{ id: string }>(
      `INSERT INTO analytics_events(event_name,page_path,placement,locale,form_id,product_slug,session_hash,field_name,event_key)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(event_key) DO NOTHING RETURNING id`,
      [event.eventName, event.pagePath, event.placement, event.locale, event.formId, event.productSlug, sessionHash, event.fieldName || "", event.eventKey]);
    if (inserted.rows.length) await tx.query(
      `INSERT INTO analytics_daily_summary(day,event_name,page_path,placement,locale,field_name,event_count)
       VALUES($6::date,$1,$2,$3,$4,$5,1)
       ON CONFLICT(day,event_name,page_path,placement,locale,field_name)
       DO UPDATE SET event_count=analytics_daily_summary.event_count+1`,
      [event.eventName, event.pagePath, event.placement, event.locale, event.fieldName || "", reportingDay]);
    });
    return Response.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("Analytics event storage failed", error instanceof Error ? error.name : "unknown");
    return Response.json({ code: "STORAGE_UNAVAILABLE" }, { status: 503 });
  }
}
