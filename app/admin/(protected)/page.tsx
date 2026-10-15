import Link from "next/link";
import { redirect } from "next/navigation";
import { IconActivityHeartbeat, IconArrowRight, IconBrandWhatsapp, IconFileCheck, IconMail, IconPackage } from "@tabler/icons-react";
import { can, getSession } from "@/lib/admin/auth";
import { query } from "@/lib/db";
import DashboardTrend from "@/components/admin/DashboardTrend";

async function count(sql: string) {
  try { const result = await query<{ count: number }>(sql); return Number(result.rows[0]?.count || 0); }
  catch { return null; }
}

type DailyRow = { day: string; inquiries: number; whatsapp: number };
type LeadRow = { id: string; name: string; company: string; country: string; product_interest: string; status_id: string; submitted_at: string };

async function dashboardDetails() {
  try {
    const [days, leads] = await Promise.all([
      query<DailyRow>(`WITH dates AS (SELECT generate_series((now() AT TIME ZONE 'Asia/Shanghai')::date - interval '29 days', (now() AT TIME ZONE 'Asia/Shanghai')::date, interval '1 day')::date AS day),
        inquiries AS (SELECT (submitted_at AT TIME ZONE 'Asia/Shanghai')::date AS day, count(*)::int AS total FROM form_submissions WHERE deleted_at IS NULL AND submitted_at >= now() - interval '31 days' GROUP BY 1),
        whatsapp AS (SELECT day, sum(event_count)::int AS total FROM analytics_daily_summary WHERE event_name='contact_whatsapp_click' AND day >= (now() AT TIME ZONE 'Asia/Shanghai')::date - interval '30 days' GROUP BY day)
        SELECT dates.day::text AS day, coalesce(inquiries.total,0)::int AS inquiries, coalesce(whatsapp.total,0)::int AS whatsapp FROM dates LEFT JOIN inquiries USING(day) LEFT JOIN whatsapp USING(day) ORDER BY dates.day`),
      query<LeadRow>("SELECT id,name,company,country,product_interest,status_id,submitted_at FROM form_submissions WHERE deleted_at IS NULL ORDER BY submitted_at DESC LIMIT 5"),
    ]);
    return { days: days.rows, leads: leads.rows, failed: false };
  } catch { return { days: [] as DailyRow[], leads: [] as LeadRow[], failed: true }; }
}

export default async function Dashboard() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user, "dashboard", "view")) return <div className="admin-empty">没有数据概览权限</div>;
  const [products, newLeads, forms, whatsapp, details] = await Promise.all([
    count("SELECT count(*)::int AS count FROM products WHERE deleted_at IS NULL AND status='published'"),
    count("SELECT count(*)::int AS count FROM form_submissions WHERE deleted_at IS NULL AND status_id='new'"),
    count("SELECT count(*)::int AS count FROM form_submissions WHERE (submitted_at AT TIME ZONE 'Asia/Shanghai')::date=(now() AT TIME ZONE 'Asia/Shanghai')::date AND deleted_at IS NULL"),
    count("SELECT coalesce(sum(event_count),0)::int AS count FROM analytics_daily_summary WHERE event_name='contact_whatsapp_click' AND day=(now() AT TIME ZONE 'Asia/Shanghai')::date"),
    dashboardDetails(),
  ]);
  const cards = [
    { label: "待跟进询盘", value: newLeads, href: "/admin/leads", icon: IconMail, tone: "rose" },
    { label: "今日表单提交", value: forms, href: "/admin/leads", icon: IconFileCheck, tone: "blue" },
    { label: "WhatsApp 点击", value: whatsapp, href: "/admin/analytics", icon: IconBrandWhatsapp, tone: "green" },
    { label: "已发布产品", value: products, href: "/admin/products", icon: IconPackage, tone: "violet" },
  ];
  return <div className="admin-dashboard">
    <div className="admin-page-head"><div><h1>数据概览</h1><p>欢迎回来，{user.display_name}</p></div><div className="admin-page-head-actions"><span className="admin-date-chip"><IconActivityHeartbeat size={18} stroke={1.8} />实时业务数据</span>{can(user, "leads", "view") && <Link className="admin-primary" href="/admin/leads">查看询盘<IconArrowRight size={17} stroke={1.8} /></Link>}</div></div>
    <div className="admin-stat-grid">{cards.map((card) => <Link className={`admin-stat admin-stat-${card.tone}`} key={card.label} href={card.href}><span className="admin-stat-icon"><card.icon size={25} stroke={1.8} aria-hidden="true" /></span><span className="admin-stat-label">{card.label}</span><strong>{card.value === null ? "—" : card.value.toLocaleString("zh-CN")}</strong><small>查看详情<IconArrowRight size={15} stroke={1.8} /></small></Link>)}</div>
    <div className="admin-panel admin-dashboard-trend"><div className="admin-section-heading"><div><h2>近 30 天趋势</h2><p>询盘与 WhatsApp 联系情况</p></div><Link href="/admin/analytics">查看分析<IconArrowRight size={16} stroke={1.8} /></Link></div><DashboardTrend data={details.days} /></div>
    {can(user, "leads", "view") && <div className="admin-panel admin-dashboard-leads"><div className="admin-section-heading"><div><h2>最近询盘</h2><p>按提交时间排序</p></div><Link href="/admin/leads">查看全部<IconArrowRight size={16} stroke={1.8} /></Link></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>提交时间</th><th>客户</th><th>公司</th><th>国家/地区</th><th>咨询产品</th><th>状态</th><th></th></tr></thead><tbody>{details.leads.map((lead) => <tr key={lead.id}><td>{new Date(lead.submitted_at).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}</td><td><strong>{lead.name}</strong></td><td>{lead.company}</td><td>{lead.country}</td><td>{lead.product_interest || "—"}</td><td><span className={`admin-status admin-status-${lead.status_id}`}>{lead.status_id === "new" ? "新询盘" : lead.status_id === "contacted" ? "跟进中" : lead.status_id === "closed" ? "已结束" : "处理中"}</span></td><td><Link href={`/admin/leads/${lead.id}`}>查看</Link></td></tr>)}{details.leads.length === 0 && <tr><td colSpan={7}><div className="admin-empty">{details.failed ? "询盘数据暂不可用" : "暂无询盘"}</div></td></tr>}</tbody></table></div></div>}
  </div>;
}
