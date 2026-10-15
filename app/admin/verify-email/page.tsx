import VerifyEmailForm from "@/components/admin/VerifyEmailForm";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <div className="admin-login-wrap"><VerifyEmailForm token={token} /></div>;
}
