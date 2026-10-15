import { redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

export default async function AnalyticsPage() {
  const user = await getSession(); if (!user) redirect("/admin/login");
  if (!can(user, "analytics", "view")) return <div className="admin-empty">没有访问分析权限。</div>;
  return <AnalyticsDashboard />;
}
