"use client";
import { useEffect, useState } from "react";

type Settings = Record<string, Record<string, unknown>>;
const labels: Record<string, string> = { site: "网站基础", retention: "数据保留", upload: "上传限制", tracking: "联系方式与追踪", seo: "SEO" };
const integrationLabels: Record<string, string> = { ga4: "网站访问统计", searchConsole: "搜索表现", email: "邮件通知", database: "业务数据", storage: "文件存储", scheduler: "定时同步" };
const fields: Record<string, Record<string, string>> = {
  site: { name: "网站名称", defaultLocale: "默认语言", timezone: "时区", dateFormat: "日期格式", pageSize: "默认每页数量" },
  retention: { analyticsDays: "行为数据保留天数", loginDays: "登录记录保留天数", auditDays: "审计记录保留天数" },
  upload: { maxBytes: "最大文件大小（MB）", allowedTypes: "允许文件类型" },
  tracking: { addressLabel: "地址显示文字", addressUrl: "地图链接", whatsappLabel: "WhatsApp 显示文字", whatsappUrl: "WhatsApp 跳转链接" },
  seo: { searchConsoleProperty: "Search Console 站点", indexingEnabled: "允许索引", sitemapEnabled: "启用 Sitemap", defaultTitle: "全站默认标题", defaultDescription: "全站默认描述", homeTitle: "首页 SEO 标题", homeDescription: "首页 SEO 描述" },
};
const fileTypes = [["image/jpeg", "JPG / JPEG"], ["image/png", "PNG"], ["image/webp", "WebP"], ["image/svg+xml", "SVG"], ["application/pdf", "PDF"], ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "DOCX"], ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "XLSX"]] as const;
export default function SettingsPanel({ editable }: { editable: boolean }) {
  const [settings, setSettings] = useState<Settings>({});
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/admin/settings").then((r) => r.json()).then((data) => { setSettings(data.settings || {}); setIntegrations(data.integrations || {}); }); }, []);
  function set(key: string, field: string, value: unknown) { setSettings((old) => ({ ...old, [key]: { ...old[key], [field]: value } })); }
  async function save(key: string) {
    setBusy(key); setMessage("");
    const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: settings[key] }) });
    setMessage(response.ok ? `${labels[key]}已保存` : "保存失败，请重试"); setBusy("");
    if (response.ok && key === "site") window.location.reload();
  }
  return <><div className="admin-page-head"><div><h1>系统设置</h1></div></div>
    {message && <p className="admin-success" role="status">{message}</p>}
    <div className="admin-settings-grid"><div className="admin-panel admin-settings-status"><h2>服务状态</h2><div className="admin-detail-grid">{Object.entries(integrations).map(([key, value]) => <div key={key}><strong>{integrationLabels[key] || key}</strong><span className={`admin-status ${value ? "admin-status-qualified" : ""}`}>{value ? "正常" : "待连接"}</span></div>)}</div></div>
    {Object.keys(labels).map((key) => <div className="admin-panel" key={key}><h2>{labels[key]}</h2><div className="admin-form">{Object.entries(fields[key]).map(([field, label]) => {
      const value = settings[key]?.[field];
      if (key === "upload" && field === "allowedTypes") return <fieldset className="admin-structured wide" key={field}><legend>{label}</legend><div className="admin-toolbar">{fileTypes.map(([mime, name]) => <label className="admin-inline-check" key={mime}><input type="checkbox" checked={Array.isArray(value) && value.includes(mime)} disabled={!editable} onChange={(event) => set(key, field, event.target.checked ? [...(Array.isArray(value) ? value : []), mime] : (Array.isArray(value) ? value : []).filter((item) => item !== mime))} />{name}</label>)}</div></fieldset>;
      if (key === "upload" && field === "maxBytes") return <label key={field}>{label}<input type="number" min={0.1} max={20} step={0.1} value={typeof value === "number" ? Math.round(value / 104857.6) / 10 : ""} disabled={!editable} onChange={(event) => set(key, field, Math.round(Number(event.target.value) * 1048576))} /></label>;
      if (key === "site" && field === "defaultLocale") return <label key={field}>{label}<select value={String(value || "en")} disabled={!editable} onChange={(event) => set(key, field, event.target.value)}><option value="en">English</option><option value="ar">العربية</option><option value="ru">Русский</option><option value="es">Español</option></select></label>;
      if (key === "site" && field === "dateFormat") return <label key={field}>{label}<select value={String(value || "yyyy-MM-dd")} disabled={!editable} onChange={(event) => set(key, field, event.target.value)}><option value="yyyy-MM-dd">2026-10-15</option><option value="dd/MM/yyyy">15/10/2026</option><option value="MM/dd/yyyy">10/15/2026</option></select></label>;
      if (key === "site" && field === "pageSize") return <label key={field}>{label}<select value={Number(value || 20)} disabled={!editable} onChange={(event) => set(key, field, Number(event.target.value))}>{[10,20,50,100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>;
      if (typeof value === "boolean") return <label className="checkbox-label" key={field}><input type="checkbox" checked={value} disabled={!editable} onChange={(e) => set(key, field, e.target.checked)} />{label}</label>;
      return <label key={field}>{label}<input value={Array.isArray(value) ? JSON.stringify(value) : String(value ?? "")} disabled={!editable} onChange={(e) => {
        const text = e.target.value;
        let next: unknown = text;
        if (typeof value === "number") next = Number(text);
        if (Array.isArray(value)) { try { next = JSON.parse(text); } catch { next = text; } }
        set(key, field, next);
      }} /></label>;
    })}</div>{editable && <button className="admin-primary" disabled={Boolean(busy)} onClick={() => save(key)}>{busy === key ? "保存中…" : `保存${labels[key]}`}</button>}</div>)}</div>
  </>;
}
