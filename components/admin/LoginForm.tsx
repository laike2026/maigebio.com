"use client";

import { useState, type FormEvent } from "react";
import { IconEye, IconEyeOff, IconLock, IconUser } from "@tabler/icons-react";

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
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: form.get("identifier"), password: form.get("password"), remember: form.get("remember") === "on" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "登录失败");
      window.location.assign(result.redirect || "/admin");
    } catch (err) { setError(err instanceof Error ? err.message : "登录失败"); setBusy(false); }
  }
  return <form className="admin-login-card" onSubmit={submit}>
    <h1>登录管理中心</h1>
    <label>账号或邮箱<span className="admin-login-input"><IconUser size={19} stroke={1.8} aria-hidden="true" /><input name="identifier" type="text" required autoComplete="username" placeholder="请输入账号或邮箱" /></span></label>
    <label>密码<span className="admin-password admin-login-input"><IconLock size={19} stroke={1.8} aria-hidden="true" /><input name="password" type={show ? "text" : "password"} required autoComplete="current-password" placeholder="请输入密码" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? "隐藏密码" : "显示密码"}>{show ? <IconEyeOff size={19} stroke={1.8} /> : <IconEye size={19} stroke={1.8} />}</button></span></label>
    <div className="admin-login-row"><label><input name="remember" type="checkbox" /> 记住登录状态</label><a href="/admin/forgot-password">忘记密码？</a></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button className="admin-primary" disabled={busy}>{busy ? "正在登录…" : "登录"}</button>
  </form>;
}
