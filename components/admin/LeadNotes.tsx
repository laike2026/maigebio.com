"use client";
import { useCallback, useEffect, useState } from "react";
import { useAdminDate } from "./AdminPreferences";
type Note = { id: string; body: string; created_at: string; display_name: string };
export default function LeadNotes({ id, editable }: { id: string; editable: boolean }) {
  const formatDate = useAdminDate();
  const [notes, setNotes] = useState<Note[]>([]); const [body, setBody] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => { const response = await fetch(`/api/admin/leads/${id}/notes`); if (response.ok) setNotes((await response.json()).items); }, [id]);
  useEffect(() => { void load(); }, [load]);
  async function submit() { if (!body.trim()) return; setBusy(true); setError(""); const response = await fetch(`/api/admin/leads/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }); if (!response.ok) setError((await response.json()).message || "保存失败"); else { setBody(""); await load(); } setBusy(false); }
  return <div className="admin-panel"><h2>内部跟进备注</h2>{editable && <div className="admin-form"><label className="wide">添加备注<textarea rows={3} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} /></label><button className="admin-primary" type="button" disabled={busy || !body.trim()} onClick={submit}>保存备注</button></div>}{error && <p className="admin-error">{error}</p>}{notes.length ? notes.map((note) => <div key={note.id} className="admin-note"><small>{note.display_name} · {formatDate(note.created_at)}</small><p>{note.body}</p></div>) : <p className="admin-empty">暂无跟进记录</p>}</div>;
}
