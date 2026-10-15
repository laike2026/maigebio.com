import Link from "next/link";
import { redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import { query } from "@/lib/db";

async function count(sql: string) {
  try { const result = await query<{ count: number }>(sql); return Number(result.rows[0]?.count || 0); }
  catch { return null; }
}

export default async function Dashboard() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user, "dashboard", "view")) return <div className="admin-empty">没有数据概览权限</div>;
  const [products, news, newLeads, forms, events] = await Promise.all([
    count("SELECT count(*)::int AS count FROM products WHERE deleted_at IS NULL AND status='published'"),
    count("SELECT count(*)::int AS count FROM news_articles WHERE deleted_at IS NULL AND status='published'"),
    count("SELECT count(*)::int AS count FROM form_submissions WHERE deleted_at IS NULL AND status_id='new'"),
    count("SELECT count(*)::int AS count FROM form_submissions WHERE submitted_at::date=current_date AND deleted_at IS NULL"),
    count("SELECT count(*)::int AS count FROM analytics_events WHERE occurred_at::date=current_date"),
  ]);
  const cards = [
    { label: "已发布产品", value: products, href: "/admin/products" }, { label: "已发布文章", value: news, href: "/admin/news" },
    { label: "待跟进询盘", value: newLeads, href: "/admin/leads" }, { label: "今日表单提交", value: forms, href: "/admin/leads" },
    { label: "今日行为事件", value: events, href: "/admin/analytics" },
  ];
  return <><div className="admin-page-head"><div><span className="admin-eyebrow">OVERVIEW</span><h1>数据概览</h1><p>欢迎回来，{user.display_name}。这里展示真实业务记录和同步状态。</p></div></div>
    <div className="admin-stat-grid">{cards.map((card) => <Link className="admin-stat" key={card.label} href={card.href}><span>{card.label}</span><strong>{card.value === null ? "尚未配置" : card.value.toLocaleString()}</strong><small>查看详情 →</small></Link>)}</div>
    <div className="admin-panel"><h2>常用操作</h2><div className="admin-quick-links">{can(user, "products", "create") && <Link href="/admin/products/new">新增产品</Link>}{can(user, "news", "create") && <Link href="/admin/news/new">发布文章</Link>}{can(user, "leads", "view") && <Link href="/admin/leads">处理询盘</Link>}{can(user, "analytics", "view") && <Link href="/admin/analytics">查看追踪数据</Link>}</div></div>
  </>;
}
