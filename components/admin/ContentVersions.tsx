"use client";
import { useEffect, useState } from "react";
import { useAdminDate } from "./AdminPreferences";
type Version = { id: string; version: number; created_at: string };
export default function ContentVersions({ module, id, editable, onRestored }: { module: string; id: string; editable: boolean; onRestored: () => void }) {
  const formatDate = useAdminDate();
  const [items, setItems] = useState<Version[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { fetch(`/api/admin/${module}/${id}/versions`).then((r) => r.json()).then((data) => setItems(data.items || [])); }, [module, id]);
  async function restore(version: number) {
    if (!confirm(`恢复到第 ${version} 版？当前内容会保存在历史版本中。`)) return;
    const current = await fetch(`/api/admin/${module}/${id}`).then((r) => r.json());
    const response = await fetch(`/api/admin/${module}/${id}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version, expectedVersion: current.version }) });
    if (response.ok) onRestored(); else setMessage((await response.json()).message || "恢复失败");
  }
  return <div className="admin-panel"><h2>修改历史</h2>{message && <p className="admin-error">{message}</p>}{items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>版本</th><th>保存时间</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>第 {item.version} 版</td><td>{formatDate(item.created_at)}</td><td>{editable && <button className="admin-secondary" type="button" onClick={() => restore(item.version)}>恢复此版本</button>}</td></tr>)}</tbody></table></div> : <p className="admin-empty">暂无历史版本</p>}</div>;
}
