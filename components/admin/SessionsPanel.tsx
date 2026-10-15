"use client";
import { useEffect, useState } from "react";
import { useAdminDate } from "./AdminPreferences";
type Session = { id: string; current: boolean; ip: string; user_agent: string; created_at: string; expires_at: string };
export default function SessionsPanel() {
  const formatDate = useAdminDate();
  const [items, setItems] = useState<Session[]>([]); const [error, setError] = useState("");
  async function load() { const response = await fetch("/api/admin/auth/sessions"); if (response.ok) setItems((await response.json()).items); else setError("无法读取会话"); }
  useEffect(() => { void load(); }, []);
  async function revoke(id: string) { if (!confirm("确定退出该设备？")) return; const response = await fetch("/api/admin/auth/sessions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (response.ok) { await load(); if (items.find((item) => item.id === id)?.current) location.assign("/admin/login"); } else setError("退出失败"); }
  return <><div className="admin-page-head"><div><h1>已登录设备</h1><p>查看并退出不再使用的会话。</p></div></div>{error && <p className="admin-error">{error}</p>}<div className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>设备</th><th>IP</th><th>登录时间</th><th>到期时间</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.user_agent.slice(0, 100)} {item.current && "（当前）"}</td><td>{item.ip}</td><td>{formatDate(item.created_at)}</td><td>{formatDate(item.expires_at)}</td><td><button className="admin-secondary" onClick={() => revoke(item.id)}>退出</button></td></tr>)}</tbody></table></div></div></>;
}
