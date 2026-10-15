import Link from "next/link";
import { redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/definitions";
import LogoutButton from "@/components/admin/LogoutButton";
import { AdminPreferences } from "@/components/admin/AdminPreferences";
import { sitePreferences } from "@/lib/admin/site-preferences";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { IconDeviceDesktop, IconExternalLink, IconUserCircle } from "@tabler/icons-react";

const sections = [
  { title: "工作台", items: [{ key: "dashboard", label: "数据概览", href: "/admin" }] },
  { title: "内容管理", items: [
    { key: "products", label: "产品管理", href: "/admin/products" }, { key: "categories", label: "产品分类", href: "/admin/categories" },
    { key: "news", label: "新闻管理", href: "/admin/news" }, { key: "news_categories", label: "新闻分类", href: "/admin/news_categories" },
    { key: "media", label: "媒体库", href: "/admin/media" },
  ] },
  { title: "客户与增长", items: [
    { key: "leads", label: "客户询盘", href: "/admin/leads" }, { key: "lead_statuses", label: "询盘状态", href: "/admin/lead_statuses" }, { key: "analytics", label: "访问与行为追踪", href: "/admin/analytics" },
    { key: "seo", label: "SEO 数据", href: "/admin/seo" }, { key: "sync", label: "数据同步", href: "/admin/sync" },
  ] },
  { title: "系统管理", items: [
    { key: "users", label: "用户管理", href: "/admin/users" }, { key: "roles", label: "角色权限", href: "/admin/roles" },
    { key: "audit", label: "操作日志", href: "/admin/audit" }, { key: "settings", label: "系统设置", href: "/admin/settings" },
  ] },
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  const preferences = await sitePreferences();
  const visibleSections = sections.map((section) => ({ ...section, items: section.items.filter((item) => can(user, item.key, "view") || (item.key === "dashboard" && can(user, "dashboard", "view"))) }));
  return <AdminPreferences value={preferences}><div className="admin-app">
    <AdminNavigation sections={visibleSections} />
    <div className="admin-main"><header className="admin-topbar"><div className="admin-topbar-title"><strong>MAIGE Bio</strong><span>管理中心</span></div><div className="admin-topbar-actions"><Link href="/en" target="_blank"><IconExternalLink size={17} stroke={1.8} aria-hidden="true" />查看网站</Link><Link href="/admin/sessions"><IconDeviceDesktop size={17} stroke={1.8} aria-hidden="true" />登录设备</Link><Link className="admin-account-link" href="/admin/account"><IconUserCircle size={22} stroke={1.7} aria-hidden="true" /><span>{user.display_name}</span></Link><LogoutButton /></div></header><main className="admin-content">{user.must_change_password && <p className="admin-error">首次登录请先<Link href="/admin/change-password">修改密码 →</Link></p>}{children}</main></div>
  </div></AdminPreferences>;
}
