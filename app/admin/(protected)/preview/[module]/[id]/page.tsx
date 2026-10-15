import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import { getRecord } from "@/lib/admin/records";

export default async function Preview({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module, id } = await params;
  if (!["products", "news"].includes(module)) notFound();
  const user = await getSession(); if (!user) redirect("/admin/login");
  if (!can(user, module, "view")) return <div className="admin-empty">没有预览权限</div>;
  let record: Record<string, unknown>;
  try { record = await getRecord(module, id); } catch { notFound(); }
  const product = module === "products";
  return <><div className="admin-page-head"><div><h1>{String(record[product ? "name_en" : "title_en"])}</h1><p><Link href={`/admin/${module}/${id}`}>← 返回编辑</Link> · 未公开预览</p></div></div>
    <div className="admin-panel"><p>{String(record[product ? "summary_en" : "excerpt_en"] || "")}</p><div className="admin-content-preview" dangerouslySetInnerHTML={{ __html: String(record[product ? "description_html_en" : "body_html_en"] || "") }} /></div>
  </>;
}
