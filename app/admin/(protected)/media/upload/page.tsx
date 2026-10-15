import { redirect } from "next/navigation";
import { can, getSession } from "@/lib/admin/auth";
import MediaUploader from "@/components/admin/MediaUploader";

export default async function MediaUploadPage() {
  const user = await getSession(); if (!user) redirect("/admin/login");
  if (!can(user, "media", "create")) return <div className="admin-empty">您没有上传权限。</div>;
  return <MediaUploader />;
}
