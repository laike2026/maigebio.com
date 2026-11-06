"use client";
import { useCallback, useEffect, useState } from "react";
import { useAdminDate } from "./AdminPreferences";
import type { GoogleSearchReceipt } from "@/lib/admin/google-search-status";
import type { SiteHealthReport } from "@/lib/admin/site-health";

type Source = { id: string; name_zh: string; enabled: boolean; frequency_minutes: number; last_success_at: string | null; last_error: string | null; next_run_at: string | null };
type Job = { id: string; source_id: string; status: string; attempt: number; processed_count: number; error_code: string | null; created_at: string; duration_ms: number | null };
type Progress = { source: string; enabled: boolean; coveredThrough: string | null; availableThrough: string; pendingDays: number; error: string | null };
const jobLabels: Record<string, string> = { queued: "等待中", pending: "等待中", running: "同步中", success: "已完成", succeeded: "已完成", completed: "已完成", failed: "失败" };
function errorLabel(code: string | null) {
  if (!code) return "";
  if (code.includes("GOOGLE_SITEMAP_HTTP_403")) return "Google 账号缺少站点地图提交权限";
  if (code.includes("HTTP_403")) return "账号没有读取权限";
  if (code.includes("NOT_CONFIGURED")) return "尚未完成连接";
  if (code.includes("HTTP_401")) return "账号授权已失效";
  if (code === "SYNC_INTERRUPTED") return "任务中断，已交回队列";
  if (code === "SITEMAP_SITE_NOT_CONFIGURED") return "站点地址待配置";
  if (code.includes("SITEMAP_DISABLED")) return "站点地图尚未启用";
  return "请检查数据连接";
}
export default function SyncDashboard({ canRun, canEdit }: { canRun: boolean; canEdit: boolean }) {
  const stamp = useAdminDate();
  const [sources, setSources] = useState<Source[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [google, setGoogle] = useState<GoogleSearchReceipt | null>(null);
  const [health, setHealth] = useState<SiteHealthReport | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const [a, b, c, g, h] = await Promise.all([
        fetch("/api/admin/sync"), fetch("/api/admin/sync/jobs"), fetch("/api/admin/sync/refresh"),
        fetch("/api/admin/sync/google"), fetch("/api/admin/sync/health"),
      ]);
      if (a.ok) setSources((await a.json()).items);
      if (b.ok) setJobs((await b.json()).items);
      if (c.ok) setProgress((await c.json()).progress);
      if (g.ok) setGoogle((await g.json()).receipt);
      if (h.ok) setHealth((await h.json()).report);
    } catch {
      setMessage("无法加载同步状态，请刷新页面");
    }
  }, []);
  useEffect(() => { void load(); window.addEventListener("maige:data-synced", load); return () => window.removeEventListener("maige:data-synced", load); }, [load]);
  async function change(source: Source, enabled: boolean) {
    setBusy(source.id); setMessage("");
    try {
      const response = await fetch(`/api/admin/sync/${source.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
      setMessage(response.ok ? "设置已保存" : "设置失败");
      await load();
    } catch { setMessage("设置失败，请稍后再试"); }
    finally { setBusy(""); }
  }
  async function run(source: string) {
    setBusy(source); setMessage("");
    try {
      const response = await fetch("/api/admin/sync/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }) });
      const result = await response.json();
      const outcome = result.results?.find((item: { source: string }) => item.source === source);
      setMessage(!response.ok ? "同步未能启动，请稍后重试" : outcome?.status === "failed" ? errorLabel(outcome.error) : outcome?.status === "succeeded" ? (source === "google_sitemap" ? "Google 已接收提交请求，请查看下方处理状态" : `同步完成，处理 ${outcome.processed} 条`) : "等待队列处理");
      await load();
    } catch { setMessage("同步暂不可用"); }
    finally { setBusy(""); }
  }
  async function verify(target: "google" | "health") {
    setBusy(target); setMessage("");
    try {
      const response = await fetch(`/api/admin/sync/${target}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) { setMessage(errorLabel(data.code) || "核验失败"); return; }
      if (target === "google") setGoogle(data.receipt);
      else setHealth(data.report);
      setMessage("已更新核验记录");
    } catch { setMessage("核验失败，请稍后再试"); }
    finally { setBusy(""); }
  }
  return <><div className="admin-page-head"><div><h1>数据同步</h1><p>查看各项数据的更新情况</p></div></div>
    {message && <p className="admin-success" role="status">{message}</p>}
    <div className="admin-panel admin-sync-panel">
      <div className="admin-section-heading"><div><h2>站点巡检</h2><p>{health ? `最近检查 ${stamp(health.checkedAt)}` : "等待首次检查"}</p></div>
        {canRun && <button className="admin-secondary" disabled={Boolean(busy)} onClick={() => verify("health")}>运行巡检</button>}
      </div>
      {health && <ul className="admin-sync-list">{health.checks.map((item) => <li key={item.id}>
        <span><strong>{item.label}</strong> <span className={`admin-status${item.state === "ok" ? " admin-status-qualified" : item.state === "error" ? " admin-status-spam" : ""}`}>{item.state === "ok" ? "正常" : item.state === "waiting" ? "等待" : "需处理"}</span></span>
        <small>{item.detail}</small>
      </li>)}</ul>}
    </div>
    <div className="admin-panel admin-sync-panel">
      <div className="admin-section-heading"><div><h2>Google 提交与收录核验</h2><p>{google ? `${google.property} · ${stamp(google.checkedAt)}` : "等待读取 Search Console 报告"}</p></div>
        {canRun && <button className="admin-secondary" disabled={Boolean(busy)} onClick={() => verify("google")}>读取 Google 报告</button>}
      </div>
      {google && <>
        <dl className="admin-sync-facts">
          <div><dt>本站提交获接收</dt><dd>{stamp(google.acceptedAt)}</dd></div>
          <div><dt>Google 记录的提交</dt><dd>{stamp(google.lastSubmitted)}</dd></div>
          <div><dt>Google 最近读取</dt><dd>{stamp(google.lastDownloaded)}</dd></div>
          <div><dt>地图处理</dt><dd>{google.readError ? errorLabel(google.readError) : google.pending ? "等待 Google 处理" : google.lastDownloaded ? `${google.errors ?? 0} 个错误 · ${google.warnings ?? 0} 个提醒` : "等待读取"}</dd></div>
        </dl>
        <ul className="admin-sync-list">{google.inspection.map((item) => <li key={item.path}>
          <span>{item.path}</span><small>{item.error ? errorLabel(item.error) : item.verdict === "PASS" ? "已收录" : item.coverage || "等待结果"}{item.lastCrawl ? ` · 抓取 ${stamp(item.lastCrawl)}` : ""}</small>
        </li>)}</ul>
      </>}
    </div>
    <div className="admin-panel"><h2>外部数据覆盖进度</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>数据来源</th><th>已覆盖至</th><th>同步目标日期</th><th>状态</th></tr></thead><tbody>{progress.map((item) => <tr key={item.source}><td>{item.source === "ga4" ? "GA4 访问分析" : "Google 搜索表现"}</td><td>{item.coveredThrough || "—"}</td><td>{item.availableThrough}</td><td>{!item.enabled ? "已停用" : item.error ? errorLabel(item.error) : item.pendingDays ? `待补齐 ${item.pendingDays} 天` : "已补齐"}</td></tr>)}</tbody></table></div><p>Search Console 使用已定稿的数据，并定期复核最近日期。</p></div>
      <div className="admin-panel"><h2>同步项目</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>项目</th><th>状态</th><th>更新间隔</th><th>最近更新</th><th>下次更新</th><th>操作</th></tr></thead><tbody>{sources.map((source) => <tr key={source.id}><td>{source.name_zh}</td><td><span className={`admin-status ${source.enabled && !source.last_error ? "admin-status-qualified" : ""}`}>{!source.enabled ? "已停用" : source.last_error ? "同步异常" : source.last_success_at ? "已启用" : "等待首次同步"}</span>{source.last_error && <small>{errorLabel(source.last_error)}</small>}</td><td>{source.id === "google_sitemap" ? "每周一 09:00" : ["ga4","search_console"].includes(source.id) ? "打开后台时；每 3 天兜底" : source.frequency_minutes >= 1440 ? "每天" : `${source.frequency_minutes} 分钟`}</td><td>{stamp(source.last_success_at)}</td><td>{stamp(source.next_run_at)}</td><td>{canEdit && <button className="admin-secondary" disabled={Boolean(busy)} onClick={() => change(source, !source.enabled)}>{source.enabled ? "停用" : "启用"}</button>} {canRun && <button className="admin-primary" disabled={Boolean(busy)} onClick={() => run(source.id)}>{busy === source.id ? "运行中…" : "立即更新"}</button>}</td></tr>)}</tbody></table></div></div>
    <div className="admin-panel"><h2>最近记录</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>时间</th><th>项目</th><th>状态</th><th>处理数量</th><th>耗时</th></tr></thead><tbody>{jobs.map((job) => <tr key={job.id}><td>{stamp(job.created_at)}</td><td>{sources.find((source) => source.id === job.source_id)?.name_zh || "数据更新"}</td><td><span className={`admin-status ${["success","succeeded","completed"].includes(job.status) ? "admin-status-qualified" : ""}`}>{jobLabels[job.status] || "未知状态"}</span>{job.status === "failed" && <small>{errorLabel(job.error_code)}</small>}</td><td>{["success","succeeded","completed","failed"].includes(job.status) ? job.processed_count : "—"}</td><td>{job.duration_ms === null ? "—" : job.duration_ms < 1000 ? "<1 秒" : `${Math.round(job.duration_ms / 1000)} 秒`}</td></tr>)}</tbody></table></div></div>
  </>;
}
