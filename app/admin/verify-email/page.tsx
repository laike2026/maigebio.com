import VerifyEmailForm from "@/components/admin/VerifyEmailForm";
import AdminAuthShell from "@/components/admin/AdminAuthShell";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AdminAuthShell><VerifyEmailForm token={token} /></AdminAuthShell>;
}
