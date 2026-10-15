"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function AccountForm({ username, email }: { username: string | null; email: string }) {
  const [loginName, setLoginName] = useState(username || "");
  const [nextEmail, setNextEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/auth/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginName, email: nextEmail, currentPassword: password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "保存失败");
      setMessage(data.message); setPassword("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败"); }
    finally { setBusy(false); }
  }
  return <div className="admin-panel"><form className="admin-form" onSubmit={submit}>
    <label>登录账号<input value={loginName} onChange={(event) => setLoginName(event.target.value)} required minLength={3} maxLength={32} autoComplete="username" pattern="[a-z][a-z0-9._-]{2,31}" /><small>账号或邮箱均可登录。</small></label>
    <label>邮箱<input type="email" value={nextEmail} onChange={(event) => setNextEmail(event.target.value)} required autoComplete="email" /><small>修改邮箱后，须点击发送到新邮箱的验证链接。</small></label>
    <label>当前密码<span className="admin-password"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>{showPassword ? "隐藏" : "显示"}</button></span></label>
    {error && <p className="admin-error" role="alert">{error}</p>}{message && <p className="admin-success" role="status">{message}</p>}
    <div className="admin-form-actions"><button className="admin-primary" disabled={busy}>{busy ? "保存中…" : "保存账号资料"}</button><Link href="/admin/change-password">修改密码 →</Link></div>
  </form></div>;
}
