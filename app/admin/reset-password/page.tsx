import PasswordForm from "@/components/admin/PasswordForm";
import AdminAuthShell from "@/components/admin/AdminAuthShell";
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token = "" } = await searchParams; return <AdminAuthShell><PasswordForm mode="reset" token={token} /></AdminAuthShell>; }
