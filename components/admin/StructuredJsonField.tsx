"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const permissionModules = [
  ["products", "产品"], ["categories", "产品分类"], ["news", "新闻"], ["news_categories", "新闻分类"],
  ["media", "媒体"], ["leads", "询盘"], ["analytics", "数据分析"], ["seo", "SEO"],
  ["sync", "数据同步"], ["users", "用户与角色"], ["audit", "操作日志"], ["settings", "系统设置"],
] as const;
const permissionActions = [["view", "查看"], ["create", "新增"], ["update", "修改"], ["delete", "删除"], ["publish", "发布"], ["export", "导出"], ["sync", "同步"]] as const;

function parse(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

export default function StructuredJsonField({ fieldKey, label, value, onChange, disabled }: {
  fieldKey: string; label: string; value: string; onChange: (value: string) => void; disabled: boolean;
}) {
  const parsed = useMemo(() => parse(value), [value]);
  const list = Array.isArray(parsed) ? parsed : [];
  const [rows, setRows] = useState<Array<{ key: string; value: string }>>([]);
  const lastEmitted = useRef("");
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const current = parse(value);
    if (fieldKey === "attributes") setRows(current && typeof current === "object" && !Array.isArray(current) ? Object.entries(current).map(([key, val]) => ({ key, value: String(val ?? "") })) : []);
    else if (fieldKey === "specifications") setRows(Array.isArray(current) ? current.map((item) => typeof item === "string" ? { key: item, value: "" } : { key: String(item?.name ?? ""), value: String(item?.value ?? "") }) : []);
    else if (fieldKey !== "permissions") setRows(Array.isArray(current) ? current.map((item) => ({ key: String(item ?? ""), value: "" })) : []);
  }, [fieldKey, value]);
  function emit(next: Array<{ key: string; value: string }>) {
    setRows(next);
    const encoded = fieldKey === "attributes" ? JSON.stringify(Object.fromEntries(next.filter((entry) => entry.key.trim()).map((entry) => [entry.key.trim(), entry.value])))
      : fieldKey === "specifications" ? JSON.stringify(next.filter((entry) => entry.key.trim() || entry.value.trim()).map((entry) => ({ name: entry.key, value: entry.value })))
      : JSON.stringify(next.map((entry) => entry.key).filter((entry) => entry.trim()));
    lastEmitted.current = encoded;
    onChange(encoded);
  }
  const setList = (next: unknown[]) => onChange(JSON.stringify(next));
  if (fieldKey === "permissions") {
    const selected = list.filter((item): item is string => typeof item === "string");
    const change = (permission: string, checked: boolean) => setList(checked ? [...selected.filter((item) => item !== permission), permission] : selected.filter((item) => item !== permission));
    return <fieldset className="admin-structured wide" disabled={disabled}><legend>{label}</legend>
      <label className="admin-inline-check"><input type="checkbox" checked={selected.includes("*")} onChange={(event) => change("*", event.target.checked)} />全部权限</label>
      <div className="admin-permission-grid">{permissionModules.map(([scope, title]) => <div className="admin-permission-row" key={scope}><strong>{title}</strong>{permissionActions.map(([action, actionLabel]) => <label key={action} className="admin-inline-check"><input type="checkbox" checked={selected.includes(`${scope}:${action}`) || selected.includes(`${scope}:*`)} onChange={(event) => change(`${scope}:${action}`, event.target.checked)} />{actionLabel}</label>)}</div>)}</div>
      <small>勾选权限后保存；“全部权限”仅供超级管理员使用。</small>
    </fieldset>;
  }
  if (fieldKey === "attributes") {
    return <fieldset className="admin-structured wide" disabled={disabled}><legend>{label}</legend><div className="admin-structured-rows">{rows.map((entry, index) => <div className="admin-structured-row" key={index}><input aria-label={`${label}名称 ${index + 1}`} placeholder="属性名称" value={entry.key} onChange={(event) => emit(rows.map((item, i) => i === index ? { ...item, key: event.target.value } : item))} /><input aria-label={`${label}内容 ${index + 1}`} placeholder="属性内容" value={entry.value} onChange={(event) => emit(rows.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} /><button type="button" className="admin-secondary" onClick={() => emit(rows.filter((_, i) => i !== index))}>移除</button></div>)}</div><button type="button" className="admin-secondary" onClick={() => emit([...rows, { key: "", value: "" }])}>＋ 添加属性</button></fieldset>;
  }
  if (fieldKey === "specifications") {
    return <fieldset className="admin-structured wide" disabled={disabled}><legend>{label}</legend><div className="admin-structured-rows">{rows.map((entry, index) => <div className="admin-structured-row" key={index}><input aria-label={`规格名称 ${index + 1}`} placeholder="规格名称，例如 MWCO" value={entry.key} onChange={(event) => emit(rows.map((item, i) => i === index ? { ...item, key: event.target.value } : item))} /><input aria-label={`规格值 ${index + 1}`} placeholder="规格值，例如 10 kDa" value={entry.value} onChange={(event) => emit(rows.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} /><button type="button" className="admin-secondary" onClick={() => emit(rows.filter((_, i) => i !== index))}>移除</button></div>)}</div><button type="button" className="admin-secondary" onClick={() => emit([...rows, { key: "", value: "" }])}>＋ 添加规格</button></fieldset>;
  }
  return <fieldset className="admin-structured wide" disabled={disabled}><legend>{label}</legend><div className="admin-structured-rows">{rows.map((entry, index) => <div className="admin-structured-row" key={index}><input aria-label={`${label} ${index + 1}`} value={entry.key} onChange={(event) => emit(rows.map((item, i) => i === index ? { ...item, key: event.target.value } : item))} placeholder={`输入${label}`} /><button type="button" className="admin-secondary" onClick={() => emit(rows.filter((_, i) => i !== index))}>移除</button></div>)}</div><button type="button" className="admin-secondary" onClick={() => emit([...rows, { key: "", value: "" }])}>＋ 添加一项</button></fieldset>;
}
