"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function PasswordForm({ mode, token = "" }: { mode: "change" | "forgot" | "reset"; token?: string }) {
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const body = mode === "forgot" ? { email: form.get("email") } : mode === "reset" ? { token, newPassword: form.get("newPassword") } : { currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") };
    try {
      const response = await fetch(`/api/admin/auth/${mode === "change" ? "change-password" : mode === "forgot" ? "forgot-password" : "reset-password"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || "操作失败");
      setMessage(mode === "forgot" ? result.message : "密码已更新，请重新登录。");
      if (mode !== "forgot") setTimeout(() => window.location.assign("/admin/login"), 1200);
    } catch (err) { setError(err instanceof Error ? err.message : "操作失败"); }
    finally { setBusy(false); }
  }
  return <form className="admin-login-card" onSubmit={submit}><h1>{mode === "forgot" ? "找回密码" : mode === "reset" ? "重置密码" : "修改密码"}</h1>
    {mode === "forgot" && <label>账户邮箱<input name="email" type="email" required /></label>}
    {mode === "change" && <label>当前密码<input name="currentPassword" type="password" required autoComplete="current-password" /></label>}
    {mode !== "forgot" && <label>新密码（至少 14 位）<input name="newPassword" type="password" required minLength={14} autoComplete="new-password" /></label>}
    {error && <p className="admin-error" role="alert">{error}</p>}{message && <p className="admin-success" role="status">{message}</p>}
    <button className="admin-primary" disabled={busy}>{busy ? "处理中…" : mode === "forgot" ? "发送重置邮件" : "保存新密码"}</button><Link href="/admin/login">返回登录</Link>
  </form>;
}
