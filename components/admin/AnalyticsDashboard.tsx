"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Report = {
  range: { start: string; end: string };
  events: { day: string; event_name: string; count: number }[];
  fields: { field_name: string; count: number }[];
  submissions: number;
  ga4: { status: "available" | "unconfigured" | "error"; message?: string; totals?: { users: number; pageViews: number; sessions: number }; daily?: { day: string; users: number; pageViews: number; sessions: number }[]; countries?: { country: string; users: number }[] };
};

const eventLabels: Record<string, string> = { contact_address_click: "地址点击", contact_whatsapp_click: "WhatsApp 点击", form_view: "表单展示", form_start: "开始填写", form_field_complete: "字段完成", form_submit_attempt: "提交尝试", form_submit_success: "提交成功", form_submit_failure: "提交失败" };
const fieldLabels: Record<string, string> = { name: "姓名", company: "公司", email: "邮箱", country: "国家", product: "产品", message: "留言", consent: "同意条款", phone: "电话" };
const tracked = ["contact_address_click", "contact_whatsapp_click", "form_view", "form_start", "form_submit_attempt", "form_submit_success"];

export default function AnalyticsDashboard() {
  const [preset, setPreset] = useState("7d");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    const params = new URLSearchParams({ preset });
    if (preset === "custom") { params.set("start", start); params.set("end", end); }
    try {
      const response = await fetch(`/api/admin/analytics?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "数据加载失败");
      setReport(result);
    } catch (err) { setError(err instanceof Error ? err.message : "数据加载失败"); }
    finally { setBusy(false); }
  }, [preset, start, end]);
  useEffect(() => { if (preset !== "custom" || (start && end)) void load(); }, [load, preset, start, end]);
  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    for (const event of report?.events || []) result[event.event_name] = (result[event.event_name] || 0) + Number(event.count);
    return result;
  }, [report]);
  const daily = useMemo(() => {
    const map = new Map<string, Record<string, string | number>>();
    for (const event of report?.events || []) {
      const day = event.day.slice(0, 10);
      const row = map.get(day) || { day };
      row[event.event_name] = (Number(row[event.event_name]) || 0) + Number(event.count);
      map.set(day, row);
    }
    return [...map.values()].sort((a, b) => String(a.day).localeCompare(String(b.day)));
  }, [report]);
  const formViews = totals.form_view || 0;
  const formStarts = totals.form_start || 0;
  const formSuccesses = totals.form_submit_success || 0;
  const funnel = [
    { name: "展示", count: formViews }, { name: "开始填写", count: formStarts },
    { name: "提交尝试", count: totals.form_submit_attempt || 0 }, { name: "提交成功", count: formSuccesses },
  ];
  return <><div className="admin-page-head"><div><span className="admin-eyebrow">ANALYTICS / CONVERSION</span><h1>访问与行为追踪</h1><p>点击与表单漏斗仅统计同意分析的访客；实际询盘以数据库记录为准。</p></div></div>
    <div className="admin-panel"><div className="admin-toolbar"><label>时间范围　<select value={preset} onChange={(event) => setPreset(event.target.value)}><option value="today">当日</option><option value="week">本周</option><option value="month">本月</option><option value="7d">最近 7 天</option><option value="30d">最近 30 天</option><option value="90d">最近 90 天</option><option value="custom">自定义</option></select></label>{preset === "custom" && <><label>开始　<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>结束　<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label></>}<span>{report?.range.start} — {report?.range.end}</span></div>{error && <p className="admin-error">{error}</p>}{busy && <p>正在加载…</p>}</div>
    {report && <><div className="admin-stat-grid">{tracked.map((name) => <div className="admin-stat" key={name}><span>{eventLabels[name]}</span><strong>{(totals[name] || 0).toLocaleString()}</strong><small>次 · 已同意分析</small></div>)}<div className="admin-stat"><span>实际收到询盘</span><strong>{report.submissions.toLocaleString()}</strong><small>条 · 数据库记录</small></div></div>
      <div className="admin-panel"><h2>表单转化漏斗</h2><p>展示 → 开始填写 → 提交尝试 → 提交成功；展示到成功转化率：{formViews ? `${(formSuccesses / formViews * 100).toFixed(1)}%` : "—"}</p><div className="admin-chart"><ResponsiveContainer width="100%" height={280}><BarChart data={funnel}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} unit="次" /><Tooltip /><Legend /><Bar dataKey="count" name="次数" fill="#1464ce" /></BarChart></ResponsiveContainer></div></div>
      <div className="admin-panel"><h2>联系行为趋势</h2>{daily.length ? <div className="admin-chart"><ResponsiveContainer width="100%" height={300}><LineChart data={daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} unit="次" /><Tooltip /><Legend /><Line dataKey="contact_whatsapp_click" name="WhatsApp 点击" stroke="#22a65b" strokeWidth={2} /><Line dataKey="contact_address_click" name="地址点击" stroke="#dd6b23" strokeWidth={2} /><Line dataKey="form_submit_success" name="表单成功" stroke="#1464ce" strokeWidth={2} /></LineChart></ResponsiveContainer></div> : <div className="admin-empty">此时间范围内没有已同意访客的追踪事件。</div>}</div>
      <div className="admin-panel"><h2>各字段完成次数</h2>{report.fields.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>字段</th><th>完成次数</th><th>相对开始填写</th></tr></thead><tbody>{report.fields.map((field) => <tr key={field.field_name}><td>{fieldLabels[field.field_name] || field.field_name}</td><td>{field.count}</td><td>{formStarts ? `${(field.count / formStarts * 100).toFixed(1)}%` : "—"}</td></tr>)}</tbody></table></div> : <div className="admin-empty">暂无字段完成数据。</div>}</div>
      <div className="admin-panel"><h2>Google Analytics 4</h2>{report.ga4.status === "unconfigured" ? <div className="admin-empty">GA4 报表服务尚未配置。请设置 GA4_PROPERTY_ID 和服务账号凭证。</div> : report.ga4.status === "error" ? <p className="admin-error">GA4 同步暂时失败：{report.ga4.message}</p> : <><div className="admin-stat-grid"><div className="admin-stat"><span>活跃用户</span><strong>{report.ga4.totals?.users || 0}</strong></div><div className="admin-stat"><span>页面浏览</span><strong>{report.ga4.totals?.pageViews || 0}</strong></div><div className="admin-stat"><span>会话</span><strong>{report.ga4.totals?.sessions || 0}</strong></div></div>{report.ga4.countries?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>访问国家/地区</th><th>活跃用户</th></tr></thead><tbody>{report.ga4.countries.map((row) => <tr key={row.country}><td>{row.country}</td><td>{row.users}</td></tr>)}</tbody></table></div> : <div className="admin-empty">GA4 暂无该范围数据。</div>}</>}</div>
    </>}
  </>;
}
