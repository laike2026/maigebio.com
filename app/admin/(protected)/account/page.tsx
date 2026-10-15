import { getSession } from "@/lib/admin/auth";
import AccountForm from "@/components/admin/AccountForm";

export default async function AccountPage() {
  const user = await getSession();
  if (!user) return null;
  return <><div className="admin-page-head"><div><h1>我的账号</h1></div></div><AccountForm username={user.username} email={user.email} /></>;
}
