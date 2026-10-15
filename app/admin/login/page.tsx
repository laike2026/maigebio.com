import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
import LoginForm from "@/components/admin/LoginForm";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect(user.must_change_password ? "/admin/change-password" : "/admin");
  return <div className="admin-login-wrap"><div className="admin-login-brand"><img src="/images/brand/maige-horizontal.png" alt="MAIGE" /><p>管理中心</p></div><LoginForm /></div>;
}
