"use client";

import { useState } from "react";
import Link from "next/link";

export default function VerifyEmailForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function confirm() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "验证失败");
      setMessage("邮箱已更新。请使用新邮箱或账号重新登录。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "验证失败"); }
    finally { setBusy(false); }
  }
  return <div className="admin-login-card"><h1>确认新邮箱</h1><p>点击下方按钮完成邮箱变更。</p>{error && <p className="admin-error" role="alert">{error}</p>}{message && <p className="admin-success" role="status">{message}</p>}{!message && <button className="admin-primary" disabled={busy || !token} onClick={confirm}>{busy ? "验证中…" : "确认邮箱"}</button>}<Link href="/admin/login">返回登录</Link></div>;
}
