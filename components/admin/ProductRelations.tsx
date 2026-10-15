"use client";

import { useEffect, useState } from "react";

type Item = { id: string; label: string };
type RelationKind = "categories" | "media" | "related";
const sections: { key: RelationKind; label: string; lookup: string }[] = [
  { key: "categories", label: "更多所属分类", lookup: "categories" },
  { key: "media", label: "产品图片与下载文件", lookup: "media" },
  { key: "related", label: "相关产品", lookup: "products" },
];

export default function ProductRelations({ id, editable }: { id: string; editable: boolean }) {
  const [selected, setSelected] = useState<Record<RelationKind, Item[]>>({ categories: [], media: [], related: [] });
  const [search, setSearch] = useState<Record<RelationKind, string>>({ categories: "", media: "", related: "" });
  const [results, setResults] = useState<Record<RelationKind, Item[]>>({ categories: [], media: [], related: [] });
  const [busy, setBusy] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { fetch(`/api/admin/products/${id}/relations`).then((response) => response.json()).then((data) => { if (data.categories) setSelected(data); }).catch(() => setMessage("关联项加载失败")); }, [id]);
  useEffect(() => {
    const timers = sections.map(({ key, lookup }) => setTimeout(() => {
      if (!search[key].trim()) { setResults((old) => ({ ...old, [key]: [] })); return; }
      fetch(`/api/admin/lookups?kind=${lookup}&q=${encodeURIComponent(search[key])}`).then((response) => response.json()).then((data) => setResults((old) => ({ ...old, [key]: data.items || [] }))).catch(() => {});
    }, 250));
    return () => timers.forEach(clearTimeout);
  }, [search]);
  async function save(key: RelationKind, items: Item[]) {
    setBusy(key); setMessage("");
    const response = await fetch(`/api/admin/products/${id}/relations`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: items.map((item) => item.id) }) });
    const result = await response.json();
    if (response.ok) { setSelected((old) => ({ ...old, [key]: items })); setMessage(`${sections.find((item) => item.key === key)?.label}已保存`); }
    else setMessage(result.message || "关联保存失败");
    setBusy("");
  }
  return <div className="admin-panel"><h2>产品关联内容</h2>{message && <p role="status">{message}</p>}{sections.map(({ key, label }) => <div className="admin-relation-section" key={key}><h3>{label}</h3><div className="admin-relation-chips">{selected[key].map((item) => <span key={item.id}>{item.label}{editable && <button type="button" aria-label={`移除 ${item.label}`} disabled={Boolean(busy)} onClick={() => save(key, selected[key].filter((entry) => entry.id !== item.id))}>×</button>}</span>)}{selected[key].length === 0 && <em>暂无关联内容</em>}</div>{editable && <><input aria-label={`搜索${label}`} placeholder={`搜索${label}…`} value={search[key]} onChange={(event) => setSearch((old) => ({ ...old, [key]: event.target.value }))} /><div className="admin-relation-search">{results[key].filter((item) => item.id !== id && !selected[key].some((entry) => entry.id === item.id)).map((item) => <button type="button" className="admin-secondary" key={item.id} disabled={Boolean(busy)} onClick={() => { void save(key, [...selected[key], item]); setSearch((old) => ({ ...old, [key]: "" })); }}>{item.label} ＋</button>)}</div></>}</div>)}</div>;
}
