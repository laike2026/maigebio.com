import { notFound, redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/definitions";
import AdminList from "@/components/admin/AdminList";

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module: name } = await params;
  const module = modules[name];
  if (!module) notFound();
  const user = await getSession();
  if (!user) redirect("/admin/login");
  if (!can(user, name, "view")) return <div className="admin-empty">您没有查看此模块的权限。</div>;
  return <AdminList module={module} canCreate={can(user, name, "create")} canUpdate={can(user, name, "update")} canDelete={can(user, name, "delete") && !["leads", "sync", "roles", "users"].includes(name)} canExport={can(user, name, "export")} canPublish={can(user, name, "publish")} />;
}
