"use client";

import { useState, type FormEvent } from "react";

export default function LoginForm() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password"), remember: form.get("remember") === "on" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "登录失败");
      window.location.assign(result.redirect || "/admin");
    } catch (err) { setError(err instanceof Error ? err.message : "登录失败"); setBusy(false); }
  }
  return <form className="admin-login-card" onSubmit={submit}>
    <span className="admin-eyebrow">MAIGE CONTROL CENTER</span><h1>登录管理后台</h1><p>请使用由管理员创建的账户。</p>
    <label>账号邮箱<input name="email" type="email" required autoComplete="username" placeholder="name@maigebio.com" /></label>
    <label>密码<span className="admin-password"><input name="password" type={show ? "text" : "password"} required autoComplete="current-password" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "隐藏密码" : "显示密码"}>{show ? "隐藏" : "显示"}</button></span></label>
    <div className="admin-login-row"><label><input name="remember" type="checkbox" /> 记住登录状态</label><a href="/admin/forgot-password">忘记密码？</a></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button className="admin-primary" disabled={busy}>{busy ? "正在登录…" : "登录"}</button>
  </form>;
}
