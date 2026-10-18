import "server-only";
import { GoogleAuth } from "google-auth-library";
import { query, transaction } from "@/lib/db";
import { ga4Configured, ga4Report } from "@/lib/ga4";

export type DataSource = "ga4" | "search_console";
const sources: DataSource[] = ["ga4", "search_console"];
const DAY = 86_400_000;
const launchDay = "2026-10-14";
const day = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const shift = (value: string, days: number) => new Date(Date.parse(`${value}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
const gap = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
const latest = (source: DataSource) => shift(new Date().toISOString().slice(0, 10), source === "ga4" ? 0 : -1);

type State = { source_id: DataSource; enabled: boolean; covered_through: string | Date; last_success_at: string | Date | null; last_error: string | null };
async function state(source: DataSource) {
  const rows = await query<State>(`SELECT s.id AS source_id,s.enabled,d.covered_through,s.last_success_at,s.last_error
    FROM sync_sources s JOIN data_sync_state d ON d.source_id=s.id WHERE s.id=$1`, [source]);
  return rows.rows[0];
}

export async function dataSyncProgress() {
  const result = await Promise.all(sources.map(async (source) => {
    const item = await state(source);
    const through = item ? day(item.covered_through) : null;
    const availableThrough = latest(source);
    return { source, enabled: Boolean(item?.enabled), coveredThrough: through, availableThrough,
      pendingDays: item?.enabled && through ? Math.max(0, gap(through, availableThrough)) : 0,
      lastSuccessAt: item?.last_success_at || null, error: item?.last_error || null };
  }));
  return result;
}

export async function queueDataSync(source: DataSource, onOpen = false) {
  return transaction(async (tx) => {
    const locked = await tx.query<State>(`SELECT s.id AS source_id,s.enabled,d.covered_through,s.last_success_at,s.last_error
      FROM sync_sources s JOIN data_sync_state d ON d.source_id=s.id WHERE s.id=$1 FOR UPDATE OF s`, [source]);
    const item = locked.rows[0];
    if (!item?.enabled) return false;
    const through = day(item.covered_through);
    const target = latest(source);
    const behind = gap(through, target);
    const last = item.last_success_at ? new Date(item.last_success_at).getTime() : 0;
    const due = behind > 3 || Date.now() - last >= 72 * 60 * 60_000;
    const refresh = onOpen && behind <= 0 && Date.now() - last >= 15 * 60_000;
    if (!(behind > 0 && (onOpen || due)) && !refresh) return false;
    const active = await tx.query(`SELECT id FROM sync_jobs WHERE source_id=$1 AND
      (status IN ('pending','running') OR (status='failed' AND attempt<max_attempts)) LIMIT 1`, [source]);
    if (active.rows.length) return false;
    await tx.query("INSERT INTO sync_jobs(source_id,idempotency_key) VALUES($1,$2)",
      [source, `data:${source}:${through}:${refresh ? "refresh" : "next"}:${crypto.randomUUID()}`]);
    return true;
  });
}

async function reportGa4(start: string, end: string) {
  if (!ga4Configured()) throw new Error("GA4_NOT_CONFIGURED");
  const report = await ga4Report({ dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }], limit: 20 });
  await transaction(async (tx) => {
    await tx.query("DELETE FROM ga4_daily_metrics WHERE day BETWEEN $1::date AND $2::date", [start, end]);
    for (const row of report.rows || []) {
      const raw = row.dimensionValues?.[0]?.value || "";
      if (!/^\d{8}$/.test(raw)) continue;
      await tx.query("INSERT INTO ga4_daily_metrics(day,users,sessions,page_views) VALUES($1,$2,$3,$4)",
        [`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, Number(row.metricValues?.[0]?.value || 0),
          Number(row.metricValues?.[1]?.value || 0), Number(row.metricValues?.[2]?.value || 0)]);
    }
    await tx.query("UPDATE data_sync_state SET covered_through=GREATEST(covered_through,$2::date),updated_at=now() WHERE source_id=$1", ["ga4", end]);
  });
  return report.rows?.length || 0;
}

async function reportSearchConsole(start: string, end: string) {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : undefined;
  if (!credentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error("SEARCH_CONSOLE_NOT_CONFIGURED");
  const setting = await query<{ value: { searchConsoleProperty?: string } }>("SELECT value FROM system_settings WHERE key='seo'");
  const property = setting.rows[0]?.value?.searchConsoleProperty || "sc-domain:maigebio.com";
  const auth = new GoogleAuth({ credentials, keyFilename: credentials ? undefined : process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("SEARCH_CONSOLE_TOKEN_UNAVAILABLE");
  const collected: { keys: string[]; clicks: number; impressions: number; position: number }[] = [];
  for (let rowStart = 0; rowStart < 50_000; rowStart += 1000) {
    const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
      method: "POST", headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions: ["date", "page", "query", "country", "device"], dataState: "all", rowLimit: 1000, startRow: rowStart }),
      cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`SEARCH_CONSOLE_HTTP_${response.status}`);
    const body = await response.json() as { rows?: typeof collected };
    collected.push(...(body.rows || []));
    if ((body.rows?.length || 0) < 1000) break;
    if (rowStart === 49_000) throw new Error("SEARCH_CONSOLE_PAGE_LIMIT");
  }
  await transaction(async (tx) => {
    await tx.query("DELETE FROM seo_metrics WHERE day BETWEEN $1::date AND $2::date", [start, end]);
    for (const row of collected) {
      const [reportDay, page, term, country, device] = row.keys;
      let path = page;
      try { path = new URL(page).pathname; } catch { /* Keep the source path. */ }
      await tx.query(`INSERT INTO seo_metrics(day,page_path,query,country,device,clicks,impressions,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(day,page_path,query,country,device) DO UPDATE SET clicks=excluded.clicks,impressions=excluded.impressions,position=excluded.position`,
        [reportDay, path, term || "", country || "", device || "", row.clicks, row.impressions, row.position]);
    }
    await tx.query("UPDATE data_sync_state SET covered_through=GREATEST(covered_through,$2::date),updated_at=now() WHERE source_id=$1", ["search_console", end]);
  });
  return collected.length;
}

export async function runDataChunk(source: DataSource) {
  const item = await state(source);
  if (!item?.enabled) return 0;
  const through = day(item.covered_through);
  const target = latest(source);
  const behind = gap(through, target);
  const start = behind > 0 ? shift(through, 1) : [launchDay, shift(target, -2)].sort().at(-1)!;
  const end = behind > 0 ? shift(start, Math.min(behind - 1, source === "ga4" ? 2 : 0)) : target;
  if (start < launchDay) throw new Error("INVALID_SYNC_RANGE");
  return source === "ga4" ? reportGa4(start, end) : reportSearchConsole(start, end);
}
