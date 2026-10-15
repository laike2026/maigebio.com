"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { ModuleDefinition } from "@/lib/admin/definitions";
import RichEditor from "./RichEditor";
import LeadNotes from "./LeadNotes";
import ContentVersions from "./ContentVersions";
import ReferencePicker from "./ReferencePicker";
import SeoFields from "./SeoFields";
import StructuredJsonField from "./StructuredJsonField";
import ProductRelations from "./ProductRelations";
import ContentTranslations from "./ContentTranslations";
import MediaDetails from "./MediaDetails";
import LeadStatusSelect from "./LeadStatusSelect";
import NewsRelations from "./NewsRelations";
import { IconArrowLeft, IconCopy, IconDeviceFloppy, IconExternalLink, IconTrash } from "@tabler/icons-react";

type RecordValue = Record<string, unknown>;

function formatInitial(value: unknown, type: string) {
  if (value === null || value === undefined) return "";
  if (type === "json") return JSON.stringify(value, null, 2);
  if (type === "datetime") return String(value).slice(0, 16);
  return String(value);
}

export default function AdminEditor({ module, id, canUpdate, canDelete, canPublish, canCreate = false }: { module: ModuleDefinition; id?: string; canUpdate: boolean; canDelete: boolean; canPublish: boolean; canCreate?: boolean }) {
  const router = useRouter();
  const isNew = !id;
  const [record, setRecord] = useState<RecordValue | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [busy, setBusy] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    if (!id) return;
    let active = true;
    fetch(`/api/admin/${module.key}/${id}`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "加载失败"); return data; }).then((data) => {
      if (!active) return;
      setRecord(data);
      setValues(Object.fromEntries(module.fields.map((field) => [field.key, field.type === "boolean" ? Boolean(data[field.key]) : formatInitial(data[field.key], field.type)])));
    }).catch((err) => active && setError(err instanceof Error ? err.message : "加载失败")).finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [id, module]);
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty]);
  function set(key: string, value: string | boolean) { setValues((previous) => ({ ...previous, [key]: value })); setDirty(true); setSuccess(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(""); setSuccess("");
    const payload: Record<string, unknown> = {};
    for (const field of module.fields) {
      if (!isNew && (field.key === "id" || field.key === "temporary_password")) continue;
      if (!(field.key in values)) continue;
      payload[field.key] = values[field.key];
    }
    if (id && ["products","news"].includes(module.key)) payload.expectedVersion = record?.version;
    try {
      const response = await fetch(`/api/admin/${module.key}${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "保存失败");
      setDirty(false); setRecord(result); setSuccess("保存成功");
      if (isNew) router.push(`/admin/${module.key}/${result.id}`);
      else router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "保存失败"); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!id || !confirm(`确定删除此${module.singular}？`)) return;
    setSaving(true);
    try { const response = await fetch(`/api/admin/${module.key}/${id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "删除失败"); setDirty(false); router.push(`/admin/${module.key}`); }
    catch (err) { setError(err instanceof Error ? err.message : "删除失败"); setSaving(false); }
  }
  async function clone() {
    if (!id || !confirm(`复制此${module.singular}为草稿？`)) return;
    setSaving(true); setError("");
    try { const response = await fetch(`/api/admin/${module.key}/${id}/clone`, { method: "POST" }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "复制失败"); router.push(`/admin/${module.key}/${result.id}`); }
    catch (err) { setError(err instanceof Error ? err.message : "复制失败"); setSaving(false); }
  }
  if (busy) return <div className="admin-empty">正在加载…</div>;
  return <><div className="admin-page-head"><div><h1>{isNew ? `新增${module.singular}` : `${module.singular}详情`}</h1><p><Link className="admin-back-link" href={`/admin/${module.key}`}><IconArrowLeft size={16} stroke={1.8} />返回{module.title}</Link></p></div></div>
    {error && <p className="admin-error" role="alert">{error}</p>}{success && <p className="admin-success" role="status">{success}</p>}
    <div className={module.key === "leads" ? "admin-lead-workspace" : "admin-editor-workspace"}><div className="admin-editor-support">
    {module.key === "leads" && record && <div className="admin-panel"><h2>询盘信息</h2><div className="admin-detail-grid">{[["name","联系人"],["company","公司"],["email","邮箱"],["phone","电话"],["country","国家/地区"],["product_interest","咨询产品"],["source_page","来源页面"],["submitted_at","提交时间"]].map(([key, label]) => <div key={key}><strong>{label}</strong><span>{key === "submitted_at" && record[key] ? new Date(String(record[key])).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : String(record[key] || "—")}</span></div>)}</div><div className="admin-lead-message"><h3>客户留言</h3><p className="admin-message">{String(record.message || "—")}</p></div></div>}
    {module.key === "leads" && id && <LeadNotes id={id} editable={canUpdate} />}
    {module.key === "media" && id && <MediaDetails id={id} />}
    {module.key === "products" && id && <ProductRelations id={id} editable={canUpdate} />}
    {module.key === "news" && id && <NewsRelations id={id} editable={canUpdate} />}
    {(module.key === "products" || module.key === "news") && id && record && <ContentTranslations module={module.key} id={id} editable={canUpdate} baseSlug={String(record.slug || "")} />}
    {id && ["products","news"].includes(module.key) && <ContentVersions module={module.key} id={id} editable={canUpdate} onRestored={() => { window.location.reload(); }} />}
    </div><div className="admin-editor-form"><div className="admin-panel"><h2>{module.key === "leads" ? "跟进设置" : isNew ? "填写信息" : "编辑信息"}</h2><form className="admin-form" onSubmit={submit}>
      {module.fields.map((field) => {
        if (!isNew && (field.key === "id" || field.key === "temporary_password")) return null;
        const value = values[field.key] ?? (field.type === "boolean" ? false : "");
        const disabled = !isNew && !canUpdate;
        const referenceKind = field.key === "parent_id" || field.key === "primary_category_id" ? "categories" : field.key === "category_id" ? "news_categories" : ["image_id","media_id","cover_id"].includes(field.key) ? "media" : field.key === "owner_id" ? "users" : field.key === "role_id" ? "roles" : "";
        if (referenceKind) return <label key={field.key}>{field.label}<ReferencePicker kind={referenceKind} value={String(value)} onChange={(id) => set(field.key, id)} disabled={disabled} label={field.label} /></label>;
        if (field.key === "status_id" && module.key === "leads") return <label key={field.key}>{field.label}<LeadStatusSelect value={String(value)} onChange={(next) => set(field.key, next)} disabled={disabled} /></label>;
        if (field.key === "seo") return <SeoFields key={field.key} value={String(value)} onChange={(json) => set(field.key, json)} disabled={disabled} />;
        if (field.type === "json") return <StructuredJsonField key={field.key} fieldKey={field.key} label={field.label} value={String(value)} onChange={(json) => set(field.key, json)} disabled={disabled} />;
        if (field.type === "boolean") return <label className="checkbox-label" key={field.key}><input type="checkbox" checked={Boolean(value)} disabled={disabled} onChange={(event) => set(field.key, event.target.checked)} />{field.label}</label>;
        return <label className={field.type === "textarea" || field.type === "html" ? "wide" : ""} key={field.key}>{field.label}{field.required && " *"}
          {field.type === "html" ? <RichEditor value={String(value)} onChange={(html) => set(field.key, html)} label={field.label} disabled={disabled} /> :
            field.type === "textarea" ? <textarea value={String(value)} disabled={disabled} onChange={(event) => set(field.key, event.target.value)} rows={4} /> :
            field.type === "select" ? <select value={String(value)} disabled={disabled} onChange={(event) => set(field.key, event.target.value)}><option value="">请选择</option>{field.options?.filter((option) => field.key !== "status" || canPublish || !["published", "scheduled"].includes(option.value) || option.value === value).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> :
            <input type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "datetime" ? "datetime-local" : "text"} step={field.type === "number" ? "any" : undefined} value={String(value)} required={field.required} disabled={disabled} onChange={(event) => set(field.key, event.target.value)} />}
          {field.help && <small>{field.help}</small>}
        </label>;
      })}
      <div className="admin-form-actions">{(isNew || canUpdate) && <button className="admin-primary" disabled={saving}><IconDeviceFloppy size={17} stroke={1.8} />{saving ? "保存中…" : "保存"}</button>}{!isNew && canCreate && ["products","news"].includes(module.key) && <button type="button" className="admin-secondary" onClick={clone} disabled={saving}><IconCopy size={17} stroke={1.8} />复制为草稿</button>}{!isNew && canDelete && <button type="button" className="admin-danger" onClick={remove} disabled={saving}><IconTrash size={17} stroke={1.8} />删除</button>}{!isNew && ["products","news"].includes(module.key) && <a className="admin-secondary" href={`/admin/preview/${module.key}/${id}`} target="_blank"><IconExternalLink size={17} stroke={1.8} />预览内容</a>}</div>
    </form></div></div></div>
  </>;
}
