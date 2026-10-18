"use client";
import { useCallback, useEffect, useState } from "react";
import { useAdminDate } from "./AdminPreferences";

type Source = { id: string; name_zh: string; enabled: boolean; frequency_minutes: number; last_success_at: string | null; last_error: string | null; next_run_at: string | null };
type Job = { id: string; source_id: string; status: string; attempt: number; processed_count: number; error_code: string | null; created_at: string; duration_ms: number | null };
const jobLabels: Record<string, string> = { queued: "等待中", pending: "等待中", running: "同步中", success: "已完成", succeeded: "已完成", completed: "已完成", failed: "失败" };
function errorLabel(code: string | null) {
  if (!code) return "";
  if (code.includes("GOOGLE_SITEMAP_HTTP_403")) return "Google 账号缺少站点地图提交权限";
  if (code.includes("HTTP_403")) return "账号没有读取权限";
  if (code.includes("NOT_CONFIGURED")) return "尚未完成连接";
  if (code.includes("HTTP_401")) return "账号授权已失效";
  if (code.includes("SITEMAP_DISABLED")) return "站点地图尚未启用";
  return "请检查数据连接";
}
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
    const outcome = result.results?.find((item: { source: string }) => item.source === source);
    setMessage(!response.ok ? "同步未能启动，请稍后重试" : outcome?.status === "failed" ? `同步失败：${errorLabel(outcome.error)}` : outcome?.status === "succeeded" ? `同步完成，处理 ${outcome.processed} 条` : "同步任务已启动");
    setBusy(""); await load();
  }
  return <><div className="admin-page-head"><div><h1>数据同步</h1><p>查看各项数据的更新情况</p></div></div>
    {message && <p className="admin-success" role="status">{message}</p>}
    <div className="admin-panel"><h2>同步项目</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>项目</th><th>状态</th><th>更新间隔</th><th>最近更新</th><th>下次更新</th><th>操作</th></tr></thead><tbody>{sources.map((source) => <tr key={source.id}><td>{source.name_zh}</td><td><span className={`admin-status ${source.enabled && !source.last_error ? "admin-status-qualified" : ""}`}>{!source.enabled ? "已停用" : source.last_error ? "同步异常" : source.last_success_at ? "已启用" : "等待首次同步"}</span>{source.last_error && <small>{errorLabel(source.last_error)}</small>}</td><td>{source.id === "google_sitemap" ? "每周一 09:00" : `${source.frequency_minutes} 分钟`}</td><td>{stamp(source.last_success_at)}</td><td>{stamp(source.next_run_at)}</td><td>{canEdit && <button className="admin-secondary" disabled={Boolean(busy)} onClick={() => change(source, !source.enabled)}>{source.enabled ? "停用" : "启用"}</button>} {canRun && <button className="admin-primary" disabled={Boolean(busy)} onClick={() => run(source.id)}>{busy === source.id ? "运行中…" : "立即更新"}</button>}</td></tr>)}</tbody></table></div></div>
    <div className="admin-panel"><h2>最近记录</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>时间</th><th>项目</th><th>状态</th><th>处理数量</th><th>耗时</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td>{stamp(job.created_at)}</td><td>{sources.find((source) => source.id === job.source_id)?.name_zh || "数据更新"}</td><td><span className={`admin-status ${["success","succeeded","completed"].includes(job.status) ? "admin-status-qualified" : ""}`}>{jobLabels[job.status] || "未知状态"}</span>{job.status === "failed" && <small>{errorLabel(job.error_code)}</small>}</td><td>{["success","succeeded","completed","failed"].includes(job.status) ? job.processed_count : "—"}</td><td>{job.duration_ms === null ? "—" : job.duration_ms < 1000 ? "<1 秒" : `${Math.round(job.duration_ms / 1000)} 秒`}</td></tr>)}</tbody></table></div></div>
  </>;
}
