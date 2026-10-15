import { can, getSession } from "@/lib/admin/auth";
import { query } from "@/lib/db";
import { ga4Configured, ga4Report } from "@/lib/ga4";
import { sitePreferences } from "@/lib/admin/site-preferences";

export const runtime = "nodejs";

function range(search: URLSearchParams, timezone: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const end = search.get("end") || today;
  const preset = search.get("preset") || "7d";
  const days = preset === "today" ? 0 : preset === "30d" ? 29 : preset === "90d" ? 89 : 6;
  const startDate = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(startDate.getTime())) throw new Error("INVALID_DATE");
  if (preset === "week") startDate.setUTCDate(startDate.getUTCDate() - ((startDate.getUTCDay() + 6) % 7));
  else if (preset === "month") startDate.setUTCDate(1);
  else startDate.setUTCDate(startDate.getUTCDate() - days);
  const start = search.get("start") || startDate.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) throw new Error("INVALID_DATE");
  if ((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000 > 365) throw new Error("RANGE_TOO_LARGE");
  return { start, end };
}

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED", message: "请先登录" }, { status: 401 });
  if (!can(user, "analytics", "view")) return Response.json({ code: "FORBIDDEN", message: "没有访问分析权限" }, { status: 403 });
  const preferences = await sitePreferences();
  let dates;
  try { dates = range(new URL(request.url).searchParams, preferences.timezone); }
  catch { return Response.json({ code: "INVALID_RANGE", message: "日期范围无效，最多 365 天" }, { status: 400 }); }
  const { start, end } = dates;
  try {
    const [events, fields, submissions] = await Promise.all([
      query<{ day: string; event_name: string; count: number }>(
        "SELECT day::text,event_name,sum(event_count)::int AS count FROM analytics_daily_summary WHERE day BETWEEN $1::date AND $2::date GROUP BY day,event_name ORDER BY day", [start, end]),
      query<{ field_name: string; count: number }>(
        "SELECT field_name,sum(event_count)::int AS count FROM analytics_daily_summary WHERE day BETWEEN $1::date AND $2::date AND event_name='form_field_complete' GROUP BY field_name ORDER BY count DESC", [start, end]),
      query<{ count: number }>("SELECT count(*)::int AS count FROM form_submissions WHERE (submitted_at AT TIME ZONE $3) >= $1::date AND (submitted_at AT TIME ZONE $3) < ($2::date + interval '1 day') AND deleted_at IS NULL", [start, end, preferences.timezone]),
    ]);
    let ga4: { status: "unconfigured" | "available" | "error"; totals?: Record<string, number>; daily?: { day: string; users: number; pageViews: number; sessions: number }[]; countries?: { country: string; users: number }[]; message?: string } = { status: "unconfigured" };
    if (ga4Configured()) {
      try {
        const period = [{ startDate: start, endDate: end }];
        const [daily, countries] = await Promise.all([
          ga4Report({ dateRanges: period, dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "sessions" }], metricAggregations: ["TOTAL"], limit: 400 }),
          ga4Report({ dateRanges: period, dimensions: [{ name: "country" }], metrics: [{ name: "activeUsers" }], orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }], limit: 10 }),
        ]);
        const dailyRows = (daily.rows || []).map((row) => ({ day: row.dimensionValues?.[0]?.value || "", users: Number(row.metricValues?.[0]?.value || 0), pageViews: Number(row.metricValues?.[1]?.value || 0), sessions: Number(row.metricValues?.[2]?.value || 0) }));
        const totalMetrics = daily.totals?.[0]?.metricValues;
        ga4 = { status: "available", daily: dailyRows, totals: {
          users: Number(totalMetrics?.[0]?.value || 0), pageViews: Number(totalMetrics?.[1]?.value || 0), sessions: Number(totalMetrics?.[2]?.value || 0),
        }, countries: (countries.rows || []).map((row) => ({ country: row.dimensionValues?.[0]?.value || "Unknown", users: Number(row.metricValues?.[0]?.value || 0) })) };
      } catch (error) { ga4 = { status: "error", message: error instanceof Error ? error.message : "GA4 暂时不可用" }; }
    }
    return Response.json({ range: dates, events: events.rows, fields: fields.rows, submissions: Number(submissions.rows[0]?.count || 0), ga4 });
  } catch (error) {
    console.error("Analytics report error", error instanceof Error ? error.name : "unknown");
    return Response.json({ code: "REPORT_UNAVAILABLE", message: "统计数据暂时无法读取" }, { status: 503 });
  }
}
