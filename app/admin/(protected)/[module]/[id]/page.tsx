import { notFound, redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/definitions";
import AdminEditor from "@/components/admin/AdminEditor";

export default async function DetailPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module: name, id } = await params;
  const module = modules[name]; if (!module) notFound();
  const user = await getSession(); if (!user) redirect("/admin/login");
  if (!can(user, name, "view")) return <div className="admin-empty">您没有查看权限。</div>;
  return <AdminEditor module={module} id={id} canUpdate={can(user, name, "update")} canDelete={can(user, name, "delete") && !["leads", "sync", "roles", "users"].includes(name)} canPublish={can(user, name, "publish")} canCreate={can(user, name, "create")} />;
}
