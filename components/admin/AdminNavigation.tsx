"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  IconActivityHeartbeat, IconAdjustments, IconArticle, IconBooks, IconCategory,
  IconChartBar, IconChevronRight, IconClipboardList, IconFileAnalytics,
  IconHistory, IconLayoutDashboard, IconMail, IconMenu2, IconPackage,
  IconPhoto, IconRefresh, IconSettings, IconShieldLock, IconTags,
  IconUsers, IconX,
} from "@tabler/icons-react";

export type AdminNavSection = {
  title: string;
  items: { key: string; label: string; href: string }[];
};

const icons = {
  dashboard: IconLayoutDashboard,
  products: IconPackage,
  categories: IconCategory,
  news: IconArticle,
  news_categories: IconTags,
  media: IconPhoto,
  leads: IconMail,
  lead_statuses: IconClipboardList,
  analytics: IconChartBar,
  seo: IconFileAnalytics,
  sync: IconRefresh,
  users: IconUsers,
  roles: IconShieldLock,
  audit: IconHistory,
  settings: IconSettings,
  redirects: IconAdjustments,
  seo_issues: IconActivityHeartbeat,
  resources: IconBooks,
} as const;

export default function AdminNavigation({ sections }: { sections: AdminNavSection[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  function openMenu() { setOpen(true); requestAnimationFrame(() => sidebar.current?.scrollTo({ top: 0 })); }
  return <>
    <button className="admin-mobile-menu" type="button" onClick={openMenu} aria-label="打开导航菜单"><IconMenu2 size={22} stroke={1.8} /></button>
    {open && <button className="admin-sidebar-backdrop" type="button" aria-label="关闭导航菜单" onClick={() => setOpen(false)} />}
    <aside ref={sidebar} className={`admin-sidebar${open ? " is-open" : ""}`}>
      <div className="admin-sidebar-heading">
        <Link className="admin-sidebar-brand" href="/admin" onClick={() => setOpen(false)}>
          <img src="/images/brand/maige-horizontal.png" alt="MAIGE" />
          <span>管理中心</span>
        </Link>
        <button className="admin-sidebar-close" type="button" onClick={() => setOpen(false)} aria-label="关闭导航菜单"><IconX size={20} /></button>
      </div>
      <nav aria-label="后台主导航">
        {sections.map((section) => section.items.length > 0 && <div className="admin-nav-section" key={section.title}>
          <span>{section.title}</span>
          {section.items.map((item) => {
            const Icon = icons[item.key as keyof typeof icons] || IconChevronRight;
            const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.key} href={item.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}><Icon size={19} stroke={1.8} aria-hidden="true" /><span>{item.label}</span></Link>;
          })}
        </div>)}
      </nav>
      <div className="admin-sidebar-foot"><span className="admin-sidebar-foot-dot" />MAIGE Bio</div>
    </aside>
  </>;
}
