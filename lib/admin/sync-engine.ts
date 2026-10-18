import "server-only";
import { GoogleAuth } from "google-auth-library";
import { sendInquiryNotification } from "@/app/api/inquiry/route";
import { query, transaction } from "@/lib/db";
import { ga4Configured, ga4Report } from "@/lib/ga4";
import { getSeoSettings } from "@/lib/seo-settings";

type Source = "ga4" | "search_console" | "seo_audit" | "google_sitemap" | "email_retry" | "retention_cleanup";
const sources: Source[] = ["ga4", "search_console", "seo_audit", "google_sitemap", "email_retry", "retention_cleanup"];
const recurringSources: Source[] = ["ga4", "search_console", "seo_audit", "email_retry", "retention_cleanup"];
const date = (value: Date) => value.toISOString().slice(0, 10);

export async function scheduleDueJobs() {
  const due = await query<{ id: Source; frequency_minutes: number }>(
    "SELECT id,frequency_minutes FROM sync_sources WHERE enabled=true AND id=ANY($1::text[]) AND (next_run_at IS NULL OR next_run_at<=now())", [recurringSources]);
  for (const source of due.rows) {
    const minutes = Math.max(5, Number(source.frequency_minutes) || 60);
    const bucket = Math.floor(Date.now() / (minutes * 60_000));
    await query("INSERT INTO sync_jobs(source_id,idempotency_key) VALUES($1,$2) ON CONFLICT DO NOTHING", [source.id, `${source.id}:${bucket}`]);
    await query("UPDATE sync_sources SET next_run_at=now()+($2::text || ' minutes')::interval,updated_at=now() WHERE id=$1", [source.id, minutes]);
  }
  return due.rows.length;
}

async function runGa4() {
  if (!ga4Configured()) throw new Error("GA4_NOT_CONFIGURED");
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6);
  const report = await ga4Report({
    dateRanges: [{ startDate: date(start), endDate: date(end) }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }], limit: 20,
  });
  for (const row of report.rows || []) {
    const raw = row.dimensionValues?.[0]?.value || "";
    if (!/^\d{8}$/.test(raw)) continue;
    const day = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    await query(`INSERT INTO ga4_daily_metrics(day,users,sessions,page_views) VALUES($1,$2,$3,$4)
      ON CONFLICT(day) DO UPDATE SET users=excluded.users,sessions=excluded.sessions,page_views=excluded.page_views,synced_at=now()`,
    [day, Number(row.metricValues?.[0]?.value || 0), Number(row.metricValues?.[1]?.value || 0), Number(row.metricValues?.[2]?.value || 0)]);
  }
  return report.rows?.length || 0;
}

async function runSearchConsole() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : undefined;
  if (!credentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error("SEARCH_CONSOLE_NOT_CONFIGURED");
  const setting = await query<{ value: { searchConsoleProperty?: string } }>("SELECT value FROM system_settings WHERE key='seo'");
  const property = setting.rows[0]?.value?.searchConsoleProperty || "sc-domain:maigebio.com";
  const auth = new GoogleAuth({ credentials, keyFilename: credentials ? undefined : process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("SEARCH_CONSOLE_TOKEN_UNAVAILABLE");
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6);
  let processed = 0;
  for (let rowStart = 0; rowStart < 10_000; rowStart += 1000) {
    const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, {
      method: "POST", headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: date(start), endDate: date(end), dimensions: ["date", "page", "query", "country", "device"], rowLimit: 1000, startRow: rowStart }),
      cache: "no-store", signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`SEARCH_CONSOLE_HTTP_${response.status}`);
    const body = await response.json() as { rows?: { keys: string[]; clicks: number; impressions: number; position: number }[] };
    for (const row of body.rows || []) {
      const [day, page, term, country, device] = row.keys;
      let path = page;
      try { path = new URL(page).pathname; } catch { /* keep source path */ }
      await query(`INSERT INTO seo_metrics(day,page_path,query,country,device,clicks,impressions,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT(day,page_path,query,country,device) DO UPDATE SET clicks=excluded.clicks,impressions=excluded.impressions,position=excluded.position`,
      [day, path, term || "", country || "", device || "", row.clicks, row.impressions, row.position]);
      processed++;
    }
    if ((body.rows?.length || 0) < 1000) break;
  }
  return processed;
}

async function runGoogleSitemap() {
  const settings = await getSeoSettings();
  if (!settings.indexingEnabled || !settings.sitemapEnabled || process.env.NEXT_PUBLIC_INDEXABLE !== "true") throw new Error("SITEMAP_DISABLED");
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site || !/^https:\/\//.test(site)) throw new Error("SITEMAP_SITE_NOT_CONFIGURED");
  const sitemapUrl = new URL("/sitemap.xml", site).toString();
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : undefined;
  if (!credentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error("SEARCH_CONSOLE_NOT_CONFIGURED");
  const auth = new GoogleAuth({ credentials, keyFilename: credentials ? undefined : process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/webmasters"] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("SEARCH_CONSOLE_TOKEN_UNAVAILABLE");
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(settings.searchConsoleProperty)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  const response = await fetch(endpoint, { method: "PUT", headers: { Authorization: `Bearer ${token.token}` }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`GOOGLE_SITEMAP_HTTP_${response.status}`);
  return 1;
}

async function runSeoAudit() {
  const issues: { kind: string; path: string; details: string; severity: string }[] = [];
  type Content = { path: string; title: string; description: string; seo: Record<string, unknown>; media_id: string | null; alt_text: string | null };
  const products = await query<{ slug: string; name_en: string; summary_en: string; seo: Record<string, unknown>; media_id: string | null; alt_text: string | null }>(
    "SELECT p.slug,p.name_en,p.summary_en,p.seo,p.media_id,m.alt_text FROM products p LEFT JOIN media_assets m ON m.id=p.media_id WHERE p.status='published' AND p.deleted_at IS NULL");
  const articles = await query<{ slug: string; title_en: string; excerpt_en: string; seo: Record<string, unknown>; media_id: string | null; alt_text: string | null }>(
    "SELECT a.slug,a.title_en,a.excerpt_en,a.seo,a.cover_id AS media_id,m.alt_text FROM news_articles a LEFT JOIN media_assets m ON m.id=a.cover_id WHERE a.status='published' AND a.deleted_at IS NULL");
  const content: Content[] = [
    ...products.rows.map((item) => ({ path: `/en/products/${item.slug}`, title: item.name_en, description: item.summary_en, seo: item.seo || {}, media_id: item.media_id, alt_text: item.alt_text })),
    ...articles.rows.map((item) => ({ path: `/en/blog/${item.slug}`, title: item.title_en, description: item.excerpt_en, seo: item.seo || {}, media_id: item.media_id, alt_text: item.alt_text })),
  ];
  const titles = new Map<string, string[]>(); const descriptions = new Map<string, string[]>();
  const add = (map: Map<string, string[]>, value: string, path: string) => { if (!value) return; map.set(value, [...(map.get(value) || []), path]); };
  for (const item of content) {
    const title = String(item.seo.title || item.title).trim(); const description = String(item.seo.description || item.description).trim();
    add(titles, title, item.path); add(descriptions, description, item.path);
    if (!item.seo.title) issues.push({ kind: "missing_title", path: item.path, details: "未单独设置 SEO 标题；当前使用内容标题", severity: "info" });
    if (!description) issues.push({ kind: "missing_description", path: item.path, details: "缺少页面描述，请补充摘要或 SEO 描述", severity: "warning" });
    if (title.length > 65 || title.length < 25) issues.push({ kind: "title_length", path: item.path, details: `标题长度 ${title.length}，建议约 25–65 字符`, severity: "info" });
    if (description && (description.length > 170 || description.length < 70)) issues.push({ kind: "description_length", path: item.path, details: `描述长度 ${description.length}，建议约 70–170 字符`, severity: "info" });
    if (!item.media_id) issues.push({ kind: "missing_image", path: item.path, details: "未设置主图或封面图", severity: "info" });
    else if (!item.alt_text) issues.push({ kind: "missing_alt", path: item.path, details: "图片缺少替代文字", severity: "warning" });
    if (item.seo.noindex === true) issues.push({ kind: "noindex", path: item.path, details: "已发布内容被设置为不收录", severity: "warning" });
  }
  for (const [kind, map] of [["duplicate_title", titles], ["duplicate_description", descriptions]] as const) for (const paths of map.values()) if (paths.length > 1) for (const path of paths) issues.push({ kind, path, details: `${paths.length} 个页面使用相同的${kind === "duplicate_title" ? "标题" : "描述"}`, severity: "warning" });
  await transaction(async (tx) => {
    await tx.query("UPDATE seo_issues SET status='resolved',resolved_at=now() WHERE status='open' AND issue_type IN ('missing_title','missing_description','missing_image','missing_alt','title_length','description_length','noindex','duplicate_title','duplicate_description')");
    for (const issue of issues) await tx.query(`INSERT INTO seo_issues(issue_type,severity,page_path,details) VALUES($1,$2,$3,$4)
      ON CONFLICT(issue_type,page_path) DO UPDATE SET details=excluded.details,severity=excluded.severity,detected_at=now(),status=CASE WHEN seo_issues.status='ignored' THEN 'ignored' ELSE 'open' END,resolved_at=NULL`,
      [issue.kind, issue.severity, issue.path, issue.details]);
  });
  return issues.length;
}

async function runEmailRetry(jobKey: string) {
  const id = jobKey.startsWith("email:") ? jobKey.slice(6) : "";
  if (id) {
    const result = await sendInquiryNotification(id);
    if (!result.ok) throw new Error(result.error || "EMAIL_RETRY_FAILED");
    return 1;
  }
  const pending = await query<{ id: string }>("SELECT id FROM form_submissions WHERE notification_status IN ('pending','failed') AND notification_attempts<5 AND deleted_at IS NULL ORDER BY submitted_at LIMIT 20");
  let sent = 0;
  for (const row of pending.rows) { const result = await sendInquiryNotification(row.id); if (result.ok) sent++; }
  return sent;
}

async function runRetentionCleanup() {
  const result = await query<{ value: { analyticsDays?: number; loginDays?: number; auditDays?: number } }>("SELECT value FROM system_settings WHERE key='retention'");
  const value = result.rows[0]?.value || {};
  const days = (input: unknown, fallback: number) => Number.isInteger(input) && Number(input) >= 30 && Number(input) <= 3650 ? Number(input) : fallback;
  const analyticsDays = days(value.analyticsDays, 365); const loginDays = days(value.loginDays, 90); const auditDays = days(value.auditDays, 730);
  const queries = [
    query("DELETE FROM analytics_events WHERE occurred_at < now()-($1::text || ' days')::interval", [analyticsDays]),
    query("DELETE FROM analytics_daily_summary WHERE day < current_date-($1::text || ' days')::interval", [analyticsDays]),
    query("DELETE FROM login_attempts WHERE created_at < now()-($1::text || ' days')::interval", [loginDays]),
    query("DELETE FROM sessions WHERE expires_at < now()-($1::text || ' days')::interval", [loginDays]),
    query("DELETE FROM password_resets WHERE expires_at < now()-interval '30 days'"),
    query("DELETE FROM audit_logs WHERE created_at < now()-($1::text || ' days')::interval", [auditDays]),
    query("DELETE FROM api_rate_limits WHERE minute_bucket < now()-interval '2 days'"),
    query("DELETE FROM export_jobs WHERE status IN ('succeeded','failed') AND finished_at < now()-interval '30 days'"),
  ];
  const cleared = await Promise.all(queries);
  return cleared.reduce((total, item) => total + item.rowCount, 0);
}

export async function runDueJobs(limit = 10, onlySource?: string) {
  const outcomes: { source: string; status: string; processed: number; error?: string }[] = [];
  for (let i = 0; i < Math.min(limit, 25); i++) {
    const claim = await query<{ id: string; source_id: Source; idempotency_key: string; attempt: number; max_attempts: number }>(
      `UPDATE sync_jobs SET status='running',attempt=attempt+1,started_at=now()
       WHERE id=(SELECT id FROM sync_jobs WHERE status IN ('pending','failed') AND run_after<=now() AND attempt<max_attempts AND ($1::text IS NULL OR source_id=$1) ORDER BY run_after,created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
       RETURNING id,source_id,idempotency_key,attempt,max_attempts`, [onlySource || null]);
    const job = claim.rows[0];
    if (!job) break;
    try {
      const processed = job.source_id === "ga4" ? await runGa4() : job.source_id === "search_console" ? await runSearchConsole()
        : job.source_id === "seo_audit" ? await runSeoAudit() : job.source_id === "google_sitemap" ? await runGoogleSitemap()
        : job.source_id === "email_retry" ? await runEmailRetry(job.idempotency_key) : job.source_id === "retention_cleanup" ? await runRetentionCleanup() : 0;
      await query("UPDATE sync_jobs SET status='succeeded',finished_at=now(),duration_ms=(extract(epoch from now()-started_at)*1000)::int,processed_count=$2,error_code=NULL,error_detail=NULL WHERE id=$1", [job.id, processed]);
      await query("UPDATE sync_sources SET last_success_at=now(),last_error=NULL,updated_at=now() WHERE id=$1", [job.source_id]);
      outcomes.push({ source: job.source_id, status: "succeeded", processed });
    } catch (error) {
      const code = error instanceof Error ? error.message.slice(0, 100) : "UNKNOWN";
      const delay = Math.min(3600, 30 * 2 ** Math.min(7, job.attempt));
      await query("UPDATE sync_jobs SET status='failed',finished_at=now(),duration_ms=(extract(epoch from now()-started_at)*1000)::int,error_code=$2,error_detail=$2,run_after=now()+($3::text || ' seconds')::interval WHERE id=$1", [job.id, code, delay]);
      await query("UPDATE sync_sources SET last_error=$2,updated_at=now() WHERE id=$1", [job.source_id, code]);
      outcomes.push({ source: job.source_id, status: "failed", processed: 0, error: code });
    }
  }
  return outcomes;
}

export async function enqueueSource(source: string) {
  if (!sources.includes(source as Source)) throw new Error("UNKNOWN_SOURCE");
  const result = await query<{ id: string }>("INSERT INTO sync_jobs(source_id,idempotency_key) VALUES($1,$2) RETURNING id", [source, `manual:${source}:${crypto.randomUUID()}`]);
  return result.rows[0].id;
}
