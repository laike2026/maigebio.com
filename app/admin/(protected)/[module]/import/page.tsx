import { notFound, redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import ImportPanel from "@/components/admin/ImportPanel";
export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params; if (module !== "products" && module !== "categories") notFound();
  const user = await getSession(); if (!user) redirect("/admin/login"); if (!can(user, module, "create")) return <div className="admin-empty">没有导入权限</div>;
  return <><div className="admin-page-head"><div><h1>{module === "products" ? "产品" : "分类"}批量导入</h1></div></div><ImportPanel module={module} /></>;
}
