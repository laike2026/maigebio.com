"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminDate } from "./AdminPreferences";
import ExportButton from "./ExportButton";

type Datum = { day: string; clicks: number; impressions: number };
type Page = { page_path: string; clicks: number; impressions: number; position: number };
type Keyword = { keyword: string; clicks: number; impressions: number; position: number };
type Segment = { country?: string; device?: string; clicks: number; impressions: number };
type Issue = { id: string; issue_type: string; severity: string; page_path: string; details: string; status: string };
type Source = { id: string; enabled: boolean; last_success_at: string | null; last_error: string | null };
type SeoData = { daily: Datum[]; pages: Page[]; keywords: Keyword[]; countries: Segment[]; devices: Segment[]; issues: Issue[]; sources: Source[]; redirects: { source_path: string; target_path: string }[]; range: { start: string; end: string } };
export default function SeoDashboard({ canExport }: { canExport: boolean }) {
  const formatDate = useAdminDate();
  const [data, setData] = useState<SeoData | null>(null); const [error, setError] = useState("");
  const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  useEffect(() => { const params = new URLSearchParams(); if (start) params.set("start", start); if (end) params.set("end", end); fetch(`/api/admin/seo?${params}`).then(async (r) => { const json = await r.json(); if (!r.ok) throw new Error(json.message || "加载失败"); setData(json); }).catch((e) => setError(String(e))); }, [start, end]);
  return <><div className="admin-page-head"><div><h1>SEO 数据</h1><p>查看搜索表现与网站问题</p></div><div className="admin-quick-links"><Link className="admin-secondary" href="/admin/seo_issues">查看全部问题</Link><Link className="admin-secondary" href="/admin/redirects">管理跳转</Link>{canExport && <ExportButton module="seo_metrics" q="" />}</div></div>
    {error && <p className="admin-error">{error}</p>}
    <div className="admin-panel"><div className="admin-toolbar"><label>开始 <input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>结束 <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label><span>{data?.range.start} — {data?.range.end}</span></div></div>
    {data && <div className="admin-seo-content"><div className="admin-panel admin-seo-source"><h2>数据连接</h2>{data.sources.map((source, index) => <p key={source.id}>搜索来源 {index + 1} · {source.enabled ? "已启用" : "未启用"} · 最近更新 {source.last_success_at ? formatDate(source.last_success_at) : "暂无"}</p>)}</div>
    <div className="admin-panel admin-seo-trend"><h2>近 30 天点击与展示</h2>{data.daily.length ? <div style={{ height: 260 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={data.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Line dataKey="clicks" stroke="#0b55c0" name="点击" /><Line dataKey="impressions" stroke="#4c9a29" name="展示" /></LineChart></ResponsiveContainer></div> : <div className="admin-empty">暂无搜索表现数据</div>}</div>
    <div className="admin-panel"><h2>热门页面</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>页面</th><th>点击</th><th>展示</th><th>CTR</th><th>平均排名</th></tr></thead><tbody>{data.pages.map((page) => <tr key={page.page_path}><td>{page.page_path}</td><td>{page.clicks}</td><td>{page.impressions}</td><td>{page.impressions ? `${(page.clicks / page.impressions * 100).toFixed(1)}%` : "—"}</td><td>{page.position || "—"}</td></tr>)}</tbody></table></div></div>
    <div className="admin-panel"><h2>搜索关键词</h2>{data.keywords.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>关键词</th><th>点击</th><th>展示</th><th>CTR</th><th>平均排名</th></tr></thead><tbody>{data.keywords.map((row) => <tr key={row.keyword}><td>{row.keyword}</td><td>{row.clicks}</td><td>{row.impressions}</td><td>{row.impressions ? `${(row.clicks / row.impressions * 100).toFixed(1)}%` : "—"}</td><td>{row.position || "—"}</td></tr>)}</tbody></table></div> : <div className="admin-empty">暂无已同步关键词。</div>}</div>
    <div className="admin-panel"><h2>国家和设备</h2><div className="admin-detail-grid">{[["国家/地区", data.countries, "country"], ["设备", data.devices, "device"]].map(([label, rows, field]) => <div key={String(label)}><strong>{String(label)}</strong>{(rows as Segment[]).map((row) => <span key={String(row[field as keyof Segment])}>{String(row[field as keyof Segment] || "未知")} · {row.clicks} 点击 / {row.impressions} 展示</span>)}</div>)}</div></div>
    <div className="admin-panel admin-seo-issues"><h2>待处理问题 ({data.issues.filter((issue) => issue.status === "open").length})</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>类型</th><th>影响程度</th><th>页面</th><th>说明</th><th>状态</th></tr></thead><tbody>{data.issues.map((issue) => <tr key={issue.id}><td>{issue.issue_type}</td><td>{issue.severity}</td><td>{issue.page_path}</td><td>{issue.details}</td><td>{issue.status === "open" ? "待处理" : issue.status === "resolved" ? "已解决" : "已忽略"}</td></tr>)}</tbody></table></div></div></div>}
  </>;
}
