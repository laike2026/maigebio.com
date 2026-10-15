"use client";

import { useEffect, useState } from "react";
import RichEditor from "./RichEditor";
import SeoFields from "./SeoFields";

type Translation = { locale: string; slug: string; title: string; excerpt: string; html: string; seo: Record<string, string>; translation_status: string };
const labels: Record<string, string> = { ar: "阿拉伯语", ru: "俄语", es: "西班牙语" };

export default function ContentTranslations({ module, id, editable, baseSlug }: { module: "products" | "news"; id: string; editable: boolean; baseSlug: string }) {
  const [items, setItems] = useState<Translation[]>([]); const [locale, setLocale] = useState("ar");
  const [draft, setDraft] = useState({ slug: baseSlug, title: "", excerpt: "", html: "", seo: "{}", status: "missing" });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { fetch(`/api/admin/translations/${module}/${id}`).then((response) => response.json()).then((data) => setItems(data.items || [])).catch(() => setMessage("翻译状态加载失败")); }, [module, id]);
  useEffect(() => { const found = items.find((item) => item.locale === locale); setDraft(found ? { slug: found.slug, title: found.title, excerpt: found.excerpt, html: found.html, seo: JSON.stringify(found.seo || {}), status: found.translation_status } : { slug: baseSlug, title: "", excerpt: "", html: "", seo: "{}", status: "missing" }); }, [items, locale, baseSlug]);
  function set(key: keyof typeof draft, value: string) { setDraft((old) => ({ ...old, [key]: value })); setMessage(""); }
  async function save() {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/admin/translations/${module}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, locale, seo: JSON.parse(draft.seo || "{}") }) });
    const result = await response.json();
    if (response.ok) { setItems((old) => [...old.filter((item) => item.locale !== locale), { ...draft, locale, seo: JSON.parse(draft.seo), translation_status: draft.status }]); setMessage(`${labels[locale]}已保存`); }
    else setMessage(result.message || "翻译保存失败");
    setBusy(false);
  }
  return <div className="admin-panel"><h2>多语言版本</h2><div className="admin-toolbar">{Object.entries(labels).map(([key, label]) => <button type="button" className={locale === key ? "admin-primary" : "admin-secondary"} key={key} onClick={() => setLocale(key)}>{label} · {items.find((item) => item.locale === key)?.translation_status === "complete" ? "已完成" : items.find((item) => item.locale === key)?.translation_status === "in_progress" ? "翻译中" : "未翻译"}</button>)}</div>
    {message && <p role="status">{message}</p>}
    <div className="admin-form"><label>翻译状态<select value={draft.status} disabled={!editable} onChange={(event) => set("status", event.target.value)}><option value="missing">未翻译</option><option value="in_progress">翻译中</option><option value="complete">已完成</option></select></label><label>网址路径<input value={draft.slug} disabled={!editable} onChange={(event) => set("slug", event.target.value)} /></label><label className="wide">{module === "products" ? "产品名称" : "文章标题"}<input value={draft.title} disabled={!editable} onChange={(event) => set("title", event.target.value)} /></label><label className="wide">摘要<textarea value={draft.excerpt} disabled={!editable} onChange={(event) => set("excerpt", event.target.value)} /></label><label className="wide">正文<RichEditor label={`${labels[locale]}正文`} value={draft.html} onChange={(value) => set("html", value)} disabled={!editable} /></label><SeoFields value={draft.seo} onChange={(value) => set("seo", value)} disabled={!editable} /></div>{editable && <button className="admin-primary" disabled={busy} onClick={save}>{busy ? "保存中…" : `保存${labels[locale]}版本`}</button>}
  </div>;
}
