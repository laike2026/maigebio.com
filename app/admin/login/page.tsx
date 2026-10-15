import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
import LoginForm from "@/components/admin/LoginForm";

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return <div className="admin-login-wrap"><div className="admin-login-brand"><img src="/images/brand/maige-horizontal.png" alt="MAIGE" /><p>网站运营管理平台</p></div><LoginForm /></div>;
}
