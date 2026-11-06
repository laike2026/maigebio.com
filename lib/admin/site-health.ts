import "server-only";
import { query } from "@/lib/db";
import { getGoogleSearchReceipt } from "@/lib/admin/google-search-status";
import { inquiryDeliveryStatus } from "@/lib/inquiry-delivery-status";
import { getSeoSettings } from "@/lib/seo-settings";

export type HealthCheck = { id: string; label: string; state: "ok" | "waiting" | "error"; detail: string };
export type SiteHealthReport = { checkedAt: string; checks: HealthCheck[] };
const reportKey = "site_health_report";

export async function getSiteHealthReport() {
  const result = await query<{ value: SiteHealthReport }>("SELECT value FROM system_settings WHERE key=$1", [reportKey]);
  return result.rows[0]?.value ?? null;
}

async function checkPublicSite(): Promise<HealthCheck> {
  const label = "公开页面与站点地图";
  const settings = await getSeoSettings();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return { id: "public", label, state: "waiting", detail: "站点地址待配置" };
  const routes: Array<[string, number]> = [
    ["/en", 200], ["/en/products?q=ELISA&q=filter", 200], ["/en/products/dialysis-tubing", 200],
    ["/en/contact", 200], ["/robots.txt", 200], ["/sitemap.xml", 200], ["/api/health", 200], ["/admin", 307],
  ];
  const results = await Promise.all(routes.map(async ([path, expected]) => {
    try {
      const response = await fetch(new URL(path, site), { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(7000) });
      if (response.status !== expected) return `${path} HTTP ${response.status}`;
      if (path === "/sitemap.xml" && settings.sitemapEnabled && settings.indexingEnabled && process.env.NEXT_PUBLIC_INDEXABLE === "true" &&
        !(await response.text()).includes(`<loc>${new URL("/en", site).href}</loc>`)) return "站点地图缺少英文首页";
      if (path === "/en" && !settings.indexingEnabled && !(await response.text()).includes('content="noindex, nofollow"')) return "首页索引状态与设置不一致";
      return null;
    } catch {
      return `${path} 请求失败`;
    }
  }));
  const failures = results.filter(Boolean);
  return { id: "public", label, state: failures.length ? "error" : "ok", detail: failures.join(" · ") || `${routes.length} 项通过` };
}

async function latestMailEvent(id?: string) {
  if (!id || !process.env.RESEND_API_KEY) return null;
  try {
    const response = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const result = await response.json();
    return typeof result.last_event === "string" ? result.last_event : null;
  } catch {
    return null;
  }
}

export async function runSiteHealth(automatic = false) {
  if (automatic) {
    const last = await getSiteHealthReport();
    if (last && Date.now() - Date.parse(last.checkedAt) < 23 * 3_600_000) return last;
  }
  const [publicCheck, sources, mail, jobs, google] = await Promise.all([
    checkPublicSite(),
    query<{ id: string; name_zh: string; enabled: boolean; last_success_at: Date | string | null; last_error: string | null }>(
      "SELECT id,name_zh,enabled,last_success_at,last_error FROM sync_sources WHERE id IN ('ga4','search_console','google_sitemap') ORDER BY id",
    ),
    query<{ pending: number; sent: number; delayed: number; latest_message: string | null }>(`SELECT
      count(*) FILTER (WHERE notification_status IN ('pending','failed'))::int AS pending,
      count(*) FILTER (WHERE notification_status='sent' AND submitted_at>=now()-interval '30 days')::int AS sent,
      count(*) FILTER (WHERE notification_status IN ('pending','failed') AND submitted_at<now()-interval '26 hours')::int AS delayed,
      (SELECT message_id FROM form_submissions WHERE deleted_at IS NULL AND notification_status='sent' AND message_id IS NOT NULL
        AND submitted_at>=now()-interval '30 days' ORDER BY submitted_at DESC LIMIT 1) AS latest_message
      FROM form_submissions WHERE deleted_at IS NULL`),
    query<{ count: number }>("SELECT count(*)::int AS count FROM sync_jobs WHERE status='running' AND started_at<now()-interval '5 minutes'"),
    getGoogleSearchReceipt(),
  ]);
  const checks: HealthCheck[] = [publicCheck];
  for (const source of sources.rows) {
    const last = source.last_success_at ? new Date(source.last_success_at) : null;
    const overdue = last && Date.now() - last.getTime() > (source.id === "google_sitemap" ? 9 * 24 : 96) * 3_600_000;
    const failed = Boolean(source.last_error || overdue);
    checks.push({
      id: source.id, label: source.name_zh,
      state: !source.enabled ? "waiting" : failed ? "error" : last ? "ok" : "waiting",
      detail: !source.enabled ? "已停用" : source.last_error ? "最近同步失败" : overdue ? "超出更新周期" : last ? last.toISOString() : "等待首次成功",
    });
  }
  checks.push({
    id: "google_read", label: "Google 地图处理",
    state: google?.readError || (google?.errors || 0) > 0 ? "error" : !google?.lastDownloaded || google.pending ? "waiting" : "ok",
    detail: google?.readError ? "读取 Google 报告失败" : google?.errors ? `${google.errors} 个处理错误` : google?.pending ? "Google 正在处理" : google?.lastDownloaded || "等待读取 Google 回执",
  });
  const email = mail.rows[0];
  const delivery = inquiryDeliveryStatus(await latestMailEvent(email.latest_message || undefined));
  const deliveryDetails = {
    delivered: "最近一封已送达",
    failed: "最近一封送达异常",
    pending: "最近一封等待送达回执",
    unavailable: "最近一封无法读取送达回执",
  };
  checks.push({
    id: "mail", label: "询盘邮件通知", state: email.delayed || delivery === "failed" ? "error" : email.pending || delivery !== "delivered" ? "waiting" : "ok",
    detail: `近 30 天邮件服务已接收 ${email.sent} 封，待发送 ${email.pending} 封，超时 ${email.delayed} 封。 ${email.latest_message ? deliveryDetails[delivery] : "暂无可核验的邮件"}`,
  });
  const interrupted = jobs.rows[0].count;
  checks.push({
    id: "jobs", label: "任务队列", state: interrupted ? "error" : "ok",
    detail: interrupted ? `${interrupted} 项任务等待超时回收` : "任务队列可用",
  });
  const report: SiteHealthReport = { checkedAt: new Date().toISOString(), checks };
  await query(`INSERT INTO system_settings(key,value) VALUES($1,$2)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`, [reportKey, JSON.stringify(report)]);
  const failures = checks.filter((item) => item.state === "error").map((item) => item.id);
  if (failures.length) console.error("MAIGE site health alert", failures.join(","));
  return report;
}
