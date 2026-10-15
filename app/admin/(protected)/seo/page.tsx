import { redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import SeoDashboard from "@/components/admin/SeoDashboard";

export default async function SeoPage() {
  const user = await getSession(); if (!user) redirect("/admin/login");
  if (!can(user, "seo", "view")) return <div className="admin-empty">没有查看权限</div>;
  return <SeoDashboard canExport={can(user, "seo", "export")} />;
}
