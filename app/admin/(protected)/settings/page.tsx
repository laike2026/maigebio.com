import { redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import SettingsPanel from "@/components/admin/SettingsPanel";

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user, "settings", "view")) return <div className="admin-empty">没有查看权限</div>;
  return <SettingsPanel editable={can(user, "settings", "update")} />;
}
