"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ModuleDefinition } from "@/lib/admin/definitions";
import ReferencePicker from "./ReferencePicker";
import LeadStatusSelect from "./LeadStatusSelect";
import ExportButton from "./ExportButton";
import { useAdminDate, useAdminPreferences } from "./AdminPreferences";
import AdminRecordPreview from "./AdminRecordPreview";
import { IconAdjustments, IconEye, IconPlus, IconSearch, IconUpload } from "@tabler/icons-react";

type Row = Record<string, unknown> & { id: string };
type Data = { items: Row[]; page: number; size: number; total: number; pages: number };

const labels: Record<string, string> = {
  id: "编号", name_en: "英文名称", title_en: "英文标题", slug: "网址路径", sku: "产品编号", status: "状态", status_id: "状态", parent_id: "父分类", category_id: "分类", enabled: "启用", sort_order: "排序", updated_at: "更新时间", created_at: "创建时间", submitted_at: "提交时间", published_at: "发布时间", featured: "推荐", author: "作者", name: "姓名", company: "公司", email: "邮箱", country: "国家/地区", product_interest: "咨询产品", owner_id: "负责人", original_name: "文件名", mime_type: "类型", size_bytes: "大小", alt_text: "图片描述", source_path: "原网址", target_path: "跳转网址", status_code: "跳转方式", issue_type: "问题类型", severity: "影响程度", page_path: "页面", detected_at: "检测时间", action: "操作", module: "板块", object_id: "对象", user_id: "用户", success: "结果", name_zh: "名称", permissions: "权限", system_role: "内置角色", last_login_at: "最近登录", role_id: "角色", frequency_minutes: "同步间隔", last_success_at: "最近同步", last_error: "最近错误", next_run_at: "下次同步",
};

const tableColumns: Record<string, string[]> = {
  products: ["name_en", "sku", "status", "updated_at"], categories: ["name_en", "enabled", "sort_order", "updated_at"],
  news: ["title_en", "status", "author", "updated_at"], news_categories: ["name_en", "enabled", "sort_order", "updated_at"],
  leads: ["name", "company", "status_id", "submitted_at"], lead_statuses: ["name_zh", "sort_order"],
  media: ["original_name", "mime_type", "size_bytes", "created_at"], roles: ["name_zh", "system_role", "updated_at"],
  users: ["display_name", "email", "role_id", "active", "last_login_at"], audit: ["action", "module", "success", "created_at"],
  sync: ["name_zh", "enabled", "last_success_at", "next_run_at"],
};

const valueLabels: Record<string, string> = {
  new: "新询盘", contacted: "跟进中", qualified: "已确认需求", closed: "已结束", spam: "无效询盘",
  draft: "草稿", review: "待审核", published: "已发布", scheduled: "定时发布", unlisted: "已下架", archived: "已归档",
  admin: "管理员", editor: "编辑", viewer: "查看者",
};

function display(value: unknown, formatDate: (value: string) => string) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return "已设置";
  const text = String(value);
  if (/^\d{4}-\d\d-\d\dT\d\d:/.test(text)) return formatDate(text).split(" ")[0];
  if (valueLabels[text]) return valueLabels[text];
  if (text.startsWith("image/")) return `${text.split("/")[1].toUpperCase()} 图片`;
  if (text === "application/pdf") return "PDF 文档";
  return text.length > 90 ? `${text.slice(0, 87)}…` : text;
}

export default function AdminList({ module, canCreate, canUpdate, canDelete, canExport, canPublish }: { module: ModuleDefinition; canCreate: boolean; canUpdate: boolean; canDelete: boolean; canExport: boolean; canPublish: boolean }) {
  const formatDate = useAdminDate();
  const preferences = useAdminPreferences();
  const [data, setData] = useState<Data | null>(null);
  const [queryText, setQueryText] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(preferences.pageSize);
  const [sort, setSort] = useState("");
  const [order, setOrder] = useState("desc");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [trash, setTrash] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
  const [leadStatuses, setLeadStatuses] = useState<{ id: string; name_zh: string }[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkOwner, setBulkOwner] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const visibleColumns = tableColumns[module.key] || module.columns.filter((column) => !["id", "owner_id", "permissions", "object_id", "user_id"].includes(column));
  function filter(key: string, value: string) { setFilters((old) => ({ ...old, [key]: value })); setPage(1); }

  useEffect(() => { const timer = setTimeout(() => { setQ(queryText); setPage(1); }, 250); return () => clearTimeout(timer); }, [queryText]);
  useEffect(() => { const timer = setTimeout(() => setAppliedFilters(filters), 250); return () => clearTimeout(timer); }, [filters]);
  useEffect(() => { if (module.key !== "leads") return; fetch("/api/admin/lead_statuses?size=100&sort=sort_order&order=asc").then((response) => response.json()).then((result) => setLeadStatuses(result.items || [])).catch(() => {}); }, [module.key]);
  const load = useCallback(async () => {
    setBusy(true); setError("");
    const params = new URLSearchParams({ page: String(page), size: String(size), q, order });
    if (sort) params.set("sort", sort);
    if (status) params.set(module.key === "leads" ? "status_id" : "status", status);
    if (trash) params.set("trash", "true");
    for (const [key, value] of Object.entries(appliedFilters)) if (value) params.set(key, value);
    try {
      const response = await fetch(`/api/admin/${module.key}?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "加载失败");
      setData(result); setSelected([]); setPreviewId((current) => result.items?.some((item: Row) => item.id === current) ? current : result.items?.[0]?.id || null);
    } catch (err) { setError(err instanceof Error ? err.message : "加载失败"); }
    finally { setBusy(false); }
  }, [module.key, page, size, q, sort, order, status, trash, appliedFilters]);
  useEffect(() => { void load(); }, [load]);

  async function bulk(action: "delete" | "publish" | "unlist" | "enable" | "disable" | "restore" | "lead_status" | "lead_owner" | "spam") {
    if (action === "lead_status" && !bulkStatus || action === "lead_owner" && !bulkOwner) { setError("请先选择要设置的状态或负责人"); return; }
    if (!selected.length || !confirm(`确认对 ${selected.length} 条记录执行此操作？`)) return;
    setBusy(true); setError("");
    let failed = 0;
    for (const id of selected) {
      const response = await fetch(`/api/admin/${module.key}/${encodeURIComponent(id)}`, {
        method: action === "delete" ? "DELETE" : action === "restore" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: action === "delete" || action === "restore" ? undefined : JSON.stringify(action === "enable" || action === "disable" ? { enabled: action === "enable" } : action === "lead_status" ? { status_id: bulkStatus } : action === "lead_owner" ? { owner_id: bulkOwner } : action === "spam" ? { status_id: "spam" } : { status: action === "publish" ? "published" : "unlisted" }),
      });
      if (!response.ok) failed++;
    }
    if (failed) setError(`${failed} 条操作失败，请逐条检查`);
    await load();
  }
  const allSelected = Boolean(data?.items.length) && data?.items.every((row) => selected.includes(row.id));
  return <>
    <div className="admin-page-head"><div><h1>{module.title}</h1><p>共 {data?.total ?? "—"} 条</p></div><div className="admin-quick-links">{module.key === "media" && canCreate && <Link className="admin-primary" href="/admin/media/upload"><IconUpload size={17} stroke={1.8} />上传文件</Link>}{canCreate && ["products","categories"].includes(module.key) && <Link className="admin-secondary" href={`/admin/${module.key}/import`}>批量导入</Link>}{canCreate && !["media", "leads", "sync", "seo_issues"].includes(module.key) && <Link className="admin-primary" href={`/admin/${module.key}/new`}><IconPlus size={17} stroke={1.8} />新增{module.singular}</Link>}{canExport && <ExportButton module={module.key} q={q} />}</div></div>
    <div className="admin-panel admin-list-panel"><div className="admin-toolbar"><div className="admin-search-field"><IconSearch size={18} stroke={1.8} aria-hidden="true" /><input aria-label="关键词搜索" placeholder="搜索名称、关键词…" value={queryText} onChange={(event) => setQueryText(event.target.value)} /></div>
      {(module.key === "products" || module.key === "news") && <select aria-label="状态筛选" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">全部状态</option><option value="draft">草稿</option><option value="review">待审核</option><option value="published">已发布</option><option value="scheduled">定时发布</option><option value="unlisted">已下架</option><option value="archived">已归档</option></select>}
      {module.key === "leads" && <select aria-label="状态筛选" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">全部状态</option>{leadStatuses.map((item) => <option key={item.id} value={item.id}>{item.name_zh}</option>)}</select>}
      <button className={`admin-filter-toggle${showAdvanced ? " is-open" : ""}`} type="button" aria-expanded={showAdvanced} onClick={() => setShowAdvanced((value) => !value)}><IconAdjustments size={17} stroke={1.8} />更多筛选</button>
      {showAdvanced && <div className="admin-advanced-filters">
      {module.key === "products" && <ReferencePicker kind="categories" value={filters.primary_category_id || ""} onChange={(value) => filter("primary_category_id", value)} disabled={false} label="分类" />}
      {module.key === "news" && <ReferencePicker kind="news_categories" value={filters.category_id || ""} onChange={(value) => filter("category_id", value)} disabled={false} label="新闻分类" />}
      {module.key === "leads" && <><input aria-label="国家筛选" placeholder="国家/地区" value={filters.country || ""} onChange={(event) => filter("country", event.target.value)} /><input aria-label="产品筛选" placeholder="产品" value={filters.product_interest || ""} onChange={(event) => filter("product_interest", event.target.value)} /><input aria-label="来源筛选" placeholder="来源页面或渠道" value={filters.source_page || ""} onChange={(event) => filter("source_page", event.target.value)} /><ReferencePicker kind="users" value={filters.owner_id || ""} onChange={(value) => filter("owner_id", value)} disabled={false} label="负责人" /></>}
      {module.key === "media" && <><select aria-label="文件类型筛选" value={filters.kind || ""} onChange={(event) => filter("kind", event.target.value)}><option value="">所有文件</option><option value="image">图片</option><option value="document">文档</option></select><label><input type="checkbox" checked={filters.unused === "true"} onChange={(event) => filter("unused", event.target.checked ? "true" : "")} /> 未使用文件</label></>}
      {["leads", "products", "news"].includes(module.key) && <><label>开始 <input aria-label="开始日期筛选" type="date" value={filters.from || ""} onChange={(event) => filter("from", event.target.value)} /></label><label>结束 <input aria-label="结束日期筛选" type="date" value={filters.to || ""} onChange={(event) => filter("to", event.target.value)} /></label></>}
      <select aria-label="排序字段" value={sort} onChange={(event) => setSort(event.target.value)}><option value="">默认排序</option>{module.columns.map((column) => <option key={column} value={column}>{labels[column] || column}</option>)}</select>
      <select aria-label="排序方向" value={order} onChange={(event) => setOrder(event.target.value)}><option value="desc">降序</option><option value="asc">升序</option></select>
      {module.softDelete && <label><input type="checkbox" checked={trash} onChange={(event) => { setTrash(event.target.checked); setPage(1); }} /> 回收站</label>}
      </div>}
      {selected.length > 0 && <><span>已选 {selected.length} 条</span>{trash ? canUpdate && <button className="admin-secondary" onClick={() => bulk("restore")}>批量恢复</button> : <>{["products", "news"].includes(module.key) && <>{canPublish && <button className="admin-secondary" onClick={() => bulk("publish")}>批量发布</button>}{canUpdate && <button className="admin-secondary" onClick={() => bulk("unlist")}>批量下架</button>}</>}{canUpdate && ["categories", "news_categories"].includes(module.key) && <><button className="admin-secondary" onClick={() => bulk("enable")}>批量启用</button><button className="admin-secondary" onClick={() => bulk("disable")}>批量停用</button></>}{canUpdate && module.key === "leads" && <><LeadStatusSelect value={bulkStatus} onChange={setBulkStatus} disabled={busy} /><button className="admin-secondary" onClick={() => bulk("lead_status")}>批量分类</button><ReferencePicker kind="users" value={bulkOwner} onChange={setBulkOwner} disabled={busy} label="负责人" /><button className="admin-secondary" onClick={() => bulk("lead_owner")}>批量分配</button><button className="admin-danger" onClick={() => bulk("spam")}>标记垃圾</button></>}{canDelete && <button className="admin-danger" onClick={() => bulk("delete")}>批量删除</button>}</>}</>}
    </div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <div className="admin-list-workspace"><div className="admin-list-primary"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th><input type="checkbox" aria-label="选择本页全部" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? (data?.items.map((row) => row.id) || []) : [])} /></th>{visibleColumns.map((column) => <th key={column}>{labels[column] || column}</th>)}<th>操作</th></tr></thead><tbody>
      {data?.items.map((row) => <tr key={row.id} className={previewId === row.id ? "is-previewed" : ""}><td><input type="checkbox" aria-label={`选择 ${row.id}`} checked={selected.includes(row.id)} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, row.id] : previous.filter((id) => id !== row.id))} /></td>{visibleColumns.map((column) => <td key={column} title={String(row[column] ?? "")}>{display(row[column], formatDate)}</td>)}<td>{trash ? canUpdate ? <button className="admin-secondary" onClick={() => { void (async () => { const response = await fetch(`/api/admin/${module.key}/${row.id}`, { method: "POST" }); if (response.ok) await load(); else setError("恢复失败"); })(); }}>恢复</button> : "—" : <button className="admin-row-preview" type="button" onClick={() => setPreviewId(row.id)} aria-label={`预览${module.singular}`}><IconEye size={17} stroke={1.8} aria-hidden="true" />速览</button>}</td></tr>)}
      {!busy && data?.items.length === 0 && <tr><td colSpan={visibleColumns.length + 2}><div className="admin-empty">暂无记录</div></td></tr>}
      {busy && !data && <tr><td colSpan={visibleColumns.length + 2}><div className="admin-empty">正在加载…</div></td></tr>}
    </tbody></table></div></div><AdminRecordPreview module={module} id={previewId} canUpdate={canUpdate} /></div>
    <div className="admin-pagination"><span>第 {data?.page || page} / {data?.pages || 1} 页，共 {data?.total || 0} 条</span><div><label>每页 <select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(1); }}>{[10,20,50,100].map((n) => <option key={n} value={n}>{n}</option>)}</select></label><button disabled={page <= 1 || busy} onClick={() => setPage(page - 1)}>上一页</button><button disabled={page >= (data?.pages || 1) || busy} onClick={() => setPage(page + 1)}>下一页</button></div></div>
    </div>
  </>;
}
