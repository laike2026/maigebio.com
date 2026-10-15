import Link from "next/link";
import { redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/definitions";
import LogoutButton from "@/components/admin/LogoutButton";
import { AdminPreferences } from "@/components/admin/AdminPreferences";
import { sitePreferences } from "@/lib/admin/site-preferences";

const sections = [
  { title: "工作台", items: [{ key: "dashboard", label: "数据概览", href: "/admin" }] },
  { title: "内容", items: [
    { key: "products", label: "产品管理", href: "/admin/products" }, { key: "categories", label: "产品分类", href: "/admin/categories" },
    { key: "news", label: "新闻管理", href: "/admin/news" }, { key: "news_categories", label: "新闻分类", href: "/admin/news_categories" },
    { key: "media", label: "媒体库", href: "/admin/media" },
  ] },
  { title: "客户与增长", items: [
    { key: "leads", label: "客户询盘", href: "/admin/leads" }, { key: "lead_statuses", label: "询盘状态", href: "/admin/lead_statuses" }, { key: "analytics", label: "访问与行为追踪", href: "/admin/analytics" },
    { key: "seo", label: "SEO 数据", href: "/admin/seo" }, { key: "sync", label: "数据同步", href: "/admin/sync" },
  ] },
  { title: "系统", items: [
    { key: "users", label: "用户管理", href: "/admin/users" }, { key: "roles", label: "角色权限", href: "/admin/roles" },
    { key: "audit", label: "操作日志", href: "/admin/audit" }, { key: "settings", label: "系统设置", href: "/admin/settings" },
  ] },
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  const preferences = await sitePreferences();
  return <AdminPreferences value={preferences}><div className="admin-app">
    <aside className="admin-sidebar"><Link className="admin-sidebar-brand" href="/admin"><img src="/images/brand/maige-horizontal.png" alt="MAIGE" /><span>管理后台</span></Link>
      <nav aria-label="后台主导航">{sections.map((section) => <div className="admin-nav-section" key={section.title}><span>{section.title}</span>{section.items.filter((item) => can(user, item.key, "view") || (item.key === "dashboard" && can(user, "dashboard", "view"))).map((item) => <Link key={item.key} href={item.href}>{item.label}</Link>)}</div>)}</nav>
    </aside>
    <div className="admin-main"><header className="admin-topbar"><div><strong>MAIGE Bio</strong><span> / 中文管理后台</span></div><div><span>{user.display_name} · {user.role_id}</span><Link href="/admin/change-password">修改密码</Link><Link href="/admin/sessions">已登录设备</Link><Link href="/en" target="_blank">查看网站 ↗</Link><LogoutButton /></div></header><main className="admin-content">{user.must_change_password && <p className="admin-error">首次登录请先<Link href="/admin/change-password">修改初始密码 →</Link></p>}{children}</main></div>
  </div></AdminPreferences>;
}
