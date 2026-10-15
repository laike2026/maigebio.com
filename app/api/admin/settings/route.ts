import { z } from "zod";
import { audit, can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
const schemas = {
  site: z.object({ name: z.string().min(1).max(100), defaultLocale: z.enum(["en", "ar", "ru", "es"]), timezone: z.string().max(60).refine((value) => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }), dateFormat: z.enum(["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy"]), pageSize: z.number().int().refine((value) => [10, 20, 50, 100].includes(value)) }),
  retention: z.object({ analyticsDays: z.number().int().min(30).max(1095), loginDays: z.number().int().min(30).max(365), auditDays: z.number().int().min(365).max(3650) }),
  upload: z.object({ maxBytes: z.number().int().min(100_000).max(20_971_520), allowedTypes: z.array(z.enum(["image/jpeg", "image/png", "image/webp", "image/svg+xml", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])).max(7) }),
  tracking: z.object({ addressLabel: z.string().max(160), addressUrl: z.union([z.url().startsWith("https://"), z.literal("")]), whatsappLabel: z.string().max(60), whatsappUrl: z.url().startsWith("https://wa.me/") }),
  seo: z.object({ searchConsoleProperty: z.string().regex(/^(sc-domain:|https:\/\/).{3,200}$/), indexingEnabled: z.boolean(), sitemapEnabled: z.boolean().default(true), defaultTitle: z.string().max(120).default(""), defaultDescription: z.string().max(320).default(""), homeTitle: z.string().max(120).default(""), homeDescription: z.string().max(320).default("") }),
};

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "settings", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const [rows, sync] = await Promise.all([
    query<{ key: string; value: unknown }>("SELECT key,value FROM system_settings ORDER BY key"),
    query<{ id: string; enabled: boolean; last_success_at: string | null; last_error: string | null }>("SELECT id,enabled,last_success_at,last_error FROM sync_sources WHERE id IN ('ga4','search_console')"),
  ]);
  const source = (id: string) => sync.rows.find((item) => item.id === id);
  const syncState = (configured: boolean, id: string) => {
    const item = source(id);
    if (!configured) return "待配置";
    if (!item?.enabled) return "自动同步未启用";
    if (item.last_error) return "同步异常";
    return item.last_success_at ? "已同步" : "等待首次同步";
  };
  const googleCredentials = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS);
  return Response.json({ settings: Object.fromEntries(rows.rows.map((row) => [row.key, row.value])), integrationStates: {
    ga4: syncState(Boolean(process.env.GA4_PROPERTY_ID && googleCredentials && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID), "ga4"),
    searchConsole: syncState(googleCredentials, "search_console"),
    email: process.env.RESEND_API_KEY ? "已配置" : "待配置",
    database: "已连接",
    storage: process.env.BLOB_READ_WRITE_TOKEN || (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID) ? "已配置" : "待配置",
    scheduler: process.env.CRON_SECRET ? "已配置" : "待配置",
  } });
}

export async function PUT(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "settings", "update")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || !("key" in raw) || !("value" in raw)) return Response.json({ code: "INVALID_BODY" }, { status: 400 });
  const key = String(raw.key);
  const schema = schemas[key as keyof typeof schemas];
  if (!schema) return Response.json({ code: "INVALID_KEY" }, { status: 400 });
  const parsed = schema.safeParse(raw.value);
  if (!parsed.success) return Response.json({ code: "INVALID_VALUE", details: parsed.error.flatten() }, { status: 400 });
  await query("INSERT INTO system_settings(key,value,updated_by) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=now()", [key, JSON.stringify(parsed.data), user.id]);
  await audit("update", "settings", user.id, key, null, { key });
  return Response.json({ ok: true });
}
