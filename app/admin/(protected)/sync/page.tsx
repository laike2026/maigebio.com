import { redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import SyncDashboard from "@/components/admin/SyncDashboard";

export default async function SyncPage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user, "sync", "view")) return <div className="admin-empty">没有查看权限</div>;
  return <SyncDashboard canRun={can(user, "sync", "sync")} canEdit={can(user, "sync", "update")} />;
}
