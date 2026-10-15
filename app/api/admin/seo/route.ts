import { can, getSession } from "@/lib/admin/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "seo", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  const search = new URL(request.url).searchParams;
  const end = search.get("end") || new Date().toISOString().slice(0, 10);
  const start = search.get("start") || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end || (new Date(end).getTime() - new Date(start).getTime()) > 366 * 86400_000) return Response.json({ code: "INVALID_RANGE", message: "日期范围无效，最多 366 天" }, { status: 400 });
  const [daily, pages, keywords, countries, devices, issues, source, redirects] = await Promise.all([
    query("SELECT day::text,sum(clicks)::int AS clicks,sum(impressions)::int AS impressions FROM seo_metrics WHERE day BETWEEN $1 AND $2 GROUP BY day ORDER BY day", [start, end]),
    query("SELECT page_path,sum(clicks)::int AS clicks,sum(impressions)::int AS impressions,round(sum(position*impressions)/nullif(sum(impressions),0),1) AS position FROM seo_metrics WHERE day BETWEEN $1 AND $2 GROUP BY page_path ORDER BY clicks DESC LIMIT 50", [start, end]),
    query("SELECT query AS keyword,sum(clicks)::int AS clicks,sum(impressions)::int AS impressions,round(sum(position*impressions)/nullif(sum(impressions),0),1) AS position FROM seo_metrics WHERE day BETWEEN $1 AND $2 AND query<>'' GROUP BY query ORDER BY clicks DESC LIMIT 50", [start, end]),
    query("SELECT country,sum(clicks)::int AS clicks,sum(impressions)::int AS impressions FROM seo_metrics WHERE day BETWEEN $1 AND $2 GROUP BY country ORDER BY clicks DESC LIMIT 30", [start, end]),
    query("SELECT device,sum(clicks)::int AS clicks,sum(impressions)::int AS impressions FROM seo_metrics WHERE day BETWEEN $1 AND $2 GROUP BY device ORDER BY clicks DESC LIMIT 20", [start, end]),
    query("SELECT id,issue_type,severity,page_path,details,status,detected_at FROM seo_issues ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END,detected_at DESC LIMIT 100"),
    query("SELECT id,enabled,last_success_at,last_error FROM sync_sources WHERE id IN ('search_console','seo_audit')"),
    query("SELECT source_path,target_path,status_code,enabled FROM redirects ORDER BY created_at DESC LIMIT 30"),
  ]);
  return Response.json({ daily: daily.rows, pages: pages.rows, keywords: keywords.rows, countries: countries.rows, devices: devices.rows, issues: issues.rows, sources: source.rows, redirects: redirects.rows, range: { start, end } });
}
