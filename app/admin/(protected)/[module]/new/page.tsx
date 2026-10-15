import { notFound, redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/definitions";
import AdminEditor from "@/components/admin/AdminEditor";

export default async function NewPage({ params }: { params: Promise<{ module: string }> }) {
  const { module: name } = await params;
  const module = modules[name]; if (!module) notFound();
  const user = await getSession(); if (!user) redirect("/admin/login");
  if (!can(user, name, "create")) return <div className="admin-empty">您没有新增权限。</div>;
  return <AdminEditor module={module} canUpdate canDelete={false} canPublish={can(user, name, "publish")} />;
}
