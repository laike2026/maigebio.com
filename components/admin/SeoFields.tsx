"use client";
import { useMemo } from "react";
export default function SeoFields({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const data = useMemo(() => { try { const parsed = JSON.parse(value || "{}"); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } }, [value]);
  function set(key: string, next: unknown) { onChange(JSON.stringify({ ...data, [key]: next })); }
  const text = (key: string, label: string, max: number, help?: string) => <label key={key}>{label}<input value={String(data[key] ?? "")} maxLength={max} disabled={disabled} onChange={(event) => set(key, event.target.value)} />{help && <small>{help}</small>}</label>;
  return <div className="admin-seo-fields"><h3>搜索展示</h3><div className="admin-form">
    {text("title", "搜索结果标题", 120)}
    {text("description", "搜索结果描述", 320)}
    {text("keywords", "关键词（逗号分隔）", 500)}
    {text("canonical", "首选页面网址", 500)}
    {text("ogTitle", "分享标题", 120)}
    {text("ogDescription", "分享描述", 320)}
    {text("ogImage", "分享图片链接", 500)}
    <label className="checkbox-label"><input type="checkbox" checked={data.noindex === true} disabled={disabled} onChange={(event) => set("noindex", event.target.checked)} />不允许搜索引擎收录</label>
  </div></div>;
}
