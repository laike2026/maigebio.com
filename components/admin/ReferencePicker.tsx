"use client";
import { useEffect, useState } from "react";
type Item = { id: string; label: string };
export default function ReferencePicker({ kind, value, onChange, disabled, label }: { kind: string; value: string; onChange: (value: string) => void; disabled: boolean; label: string }) {
  const [q, setQ] = useState(""); const [items, setItems] = useState<Item[]>([]); const [selected, setSelected] = useState(""); const [open, setOpen] = useState(false);
  useEffect(() => { if (!value) { setSelected(""); return; } fetch(`/api/admin/lookups?kind=${kind}&id=${encodeURIComponent(value)}`).then((r) => r.json()).then((data) => setSelected(data.items?.[0]?.label || value)); }, [kind, value]);
  useEffect(() => { if (!open) return; const timer = setTimeout(() => { fetch(`/api/admin/lookups?kind=${kind}&q=${encodeURIComponent(q)}`).then((r) => r.json()).then((data) => setItems(data.items || [])); }, 200); return () => clearTimeout(timer); }, [kind, q, open]);
  return <div className="admin-reference"><button type="button" className="admin-secondary" disabled={disabled} onClick={() => setOpen(!open)}>{selected || `选择${label}`}</button>{value && !disabled && <button type="button" onClick={() => onChange("")}>清除</button>}{open && !disabled && <div className="admin-reference-menu"><input autoFocus aria-label={`搜索${label}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="输入关键词搜索" /><div>{items.map((item) => <button type="button" key={item.id} onClick={() => { onChange(item.id); setSelected(item.label); setOpen(false); }}>{item.label}</button>)}{items.length === 0 && <span>无匹配项</span>}</div></div>}</div>;
}
