import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
import LoginForm from "@/components/admin/LoginForm";
import AdminAuthShell from "@/components/admin/AdminAuthShell";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect(user.must_change_password ? "/admin/change-password" : "/admin");
  return <AdminAuthShell><LoginForm /></AdminAuthShell>;
}
