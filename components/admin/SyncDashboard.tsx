"use client";
import { useCallback, useEffect, useState } from "react";
import { useAdminDate } from "./AdminPreferences";

type Source = { id: string; name_zh: string; enabled: boolean; frequency_minutes: number; last_success_at: string | null; last_error: string | null; next_run_at: string | null };
type Job = { id: string; source_id: string; status: string; attempt: number; processed_count: number; error_code: string | null; created_at: string; duration_ms: number | null };
export default function SyncDashboard({ canRun, canEdit }: { canRun: boolean; canEdit: boolean }) {
  const stamp = useAdminDate();
  const [sources, setSources] = useState<Source[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch("/api/admin/sync"), fetch("/api/admin/sync/jobs")]);
    if (a.ok) setSources((await a.json()).items);
    if (b.ok) setJobs((await b.json()).items);
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function change(source: Source, enabled: boolean) {
    setBusy(source.id); setMessage("");
    const response = await fetch(`/api/admin/sync/${source.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    setMessage(response.ok ? "设置已保存" : "设置失败"); setBusy(""); await load();
  }
  async function run(source: string) {
    setBusy(source); setMessage("");
    const response = await fetch("/api/admin/sync/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }) });
    const result = await response.json();
    setMessage(response.ok ? result.results.map((item: { source: string; status: string; error?: string }) => `${item.source}: ${item.status}${item.error ? ` (${item.error})` : ""}`).join("；") || "任务已入队" : result.message || "运行失败");
    setBusy(""); await load();
  }
  return <><div className="admin-page-head"><div><span className="admin-eyebrow">DATA OPERATIONS</span><h1>数据同步</h1><p>手动运行、计划任务、失败重试和处理记录。</p></div></div>
    {message && <p className="admin-success" role="status">{message}</p>}
    <div className="admin-panel"><h2>数据源</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>数据源</th><th>状态</th><th>间隔</th><th>上次成功</th><th>下次运行</th><th>最近错误</th><th>操作</th></tr></thead><tbody>{sources.map((source) => <tr key={source.id}><td>{source.name_zh}</td><td>{source.enabled ? "已启用" : "未启用"}</td><td>{source.frequency_minutes} 分钟</td><td>{stamp(source.last_success_at)}</td><td>{stamp(source.next_run_at)}</td><td>{source.last_error || "—"}</td><td>{canEdit && <button className="admin-secondary" disabled={Boolean(busy)} onClick={() => change(source, !source.enabled)}>{source.enabled ? "停用" : "启用"}</button>} {canRun && <button className="admin-primary" disabled={Boolean(busy)} onClick={() => run(source.id)}>{busy === source.id ? "运行中…" : "立即运行"}</button>}</td></tr>)}</tbody></table></div></div>
    <div className="admin-panel"><h2>最近任务</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>时间</th><th>来源</th><th>状态</th><th>次数</th><th>处理数</th><th>耗时</th><th>错误</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td>{stamp(job.created_at)}</td><td>{job.source_id}</td><td>{job.status}</td><td>{job.attempt}</td><td>{job.processed_count}</td><td>{job.duration_ms === null ? "—" : `${job.duration_ms} ms`}</td><td>{job.error_code || "—"}</td></tr>)}</tbody></table></div></div>
  </>;
}
