"use client";
import { useMemo } from "react";
export default function SeoFields({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const data = useMemo(() => { try { const parsed = JSON.parse(value || "{}"); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } }, [value]);
  function set(key: string, next: unknown) { onChange(JSON.stringify({ ...data, [key]: next })); }
  const text = (key: string, label: string, max: number, help?: string) => <label key={key}>{label}<input value={String(data[key] ?? "")} maxLength={max} disabled={disabled} onChange={(event) => set(key, event.target.value)} />{help && <small>{help}</small>}</label>;
  return <div className="admin-seo-fields"><h3>SEO 设置</h3><div className="admin-form">
    {text("title", "Meta Title", 120, `${String(data.title || "").length}/120 字符，建议约 50–60 字符`)}
    {text("description", "Meta Description", 320, `${String(data.description || "").length}/320 字符，建议约 150–160 字符`)}
    {text("keywords", "关键词（逗号分隔）", 500)}
    {text("canonical", "Canonical URL", 500, "留空则使用当前页面地址")}
    {text("ogTitle", "Open Graph 标题", 120)}
    {text("ogDescription", "Open Graph 描述", 320)}
    {text("ogImage", "Open Graph 图片 URL", 500)}
    <label className="checkbox-label"><input type="checkbox" checked={data.noindex === true} disabled={disabled} onChange={(event) => set("noindex", event.target.checked)} />不允许搜索引擎收录</label>
  </div></div>;
}
