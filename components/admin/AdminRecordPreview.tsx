"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowRight, IconBuilding, IconCalendar, IconMail, IconMapPin, IconPhone, IconUserCircle } from "@tabler/icons-react";
import type { ModuleDefinition } from "@/lib/admin/definitions";

type RecordValue = Record<string, unknown>;

const previewFields: Record<string, { key: string; label: string }[]> = {
  products: [{ key: "sku", label: "产品编号" }, { key: "status", label: "发布状态" }, { key: "summary_en", label: "产品摘要" }, { key: "updated_at", label: "最近更新" }],
  categories: [{ key: "name_zh", label: "中文名称" }, { key: "summary_en", label: "分类简介" }, { key: "enabled", label: "显示状态" }, { key: "updated_at", label: "最近更新" }],
  news: [{ key: "author", label: "作者" }, { key: "status", label: "发布状态" }, { key: "excerpt_en", label: "文章摘要" }, { key: "updated_at", label: "最近更新" }],
  news_categories: [{ key: "name_zh", label: "中文名称" }, { key: "enabled", label: "显示状态" }, { key: "updated_at", label: "最近更新" }],
  media: [{ key: "original_name", label: "文件名" }, { key: "alt_text", label: "图片描述" }, { key: "created_at", label: "上传时间" }],
  lead_statuses: [{ key: "name_zh", label: "状态名称" }, { key: "sort_order", label: "显示顺序" }],
  users: [{ key: "display_name", label: "姓名" }, { key: "email", label: "邮箱" }, { key: "role_id", label: "角色" }, { key: "last_login_at", label: "最近登录" }],
  roles: [{ key: "name_zh", label: "角色名称" }, { key: "system_role", label: "角色类型" }, { key: "updated_at", label: "最近更新" }],
  audit: [{ key: "action", label: "操作" }, { key: "module", label: "板块" }, { key: "success", label: "结果" }, { key: "created_at", label: "操作时间" }],
  sync: [{ key: "name_zh", label: "数据来源" }, { key: "enabled", label: "启用状态" }, { key: "last_success_at", label: "最近同步" }, { key: "next_run_at", label: "下次同步" }],
  redirects: [{ key: "source_path", label: "原网址" }, { key: "target_path", label: "跳转网址" }, { key: "enabled", label: "启用状态" }],
  seo_issues: [{ key: "page_path", label: "页面" }, { key: "severity", label: "影响程度" }, { key: "status", label: "处理状态" }],
};

const statusLabels: Record<string, string> = {
  new: "新询盘", contacted: "跟进中", qualified: "已确认需求", closed: "已结束", spam: "无效询盘",
  draft: "草稿", review: "待审核", published: "已发布", unlisted: "已下架", archived: "已归档",
  open: "待处理", resolved: "已解决", ignored: "已忽略",
};

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return "已设置";
  const text = String(value);
  if (/^\d{4}-\d\d-\d\dT\d\d:/.test(text)) return new Date(text).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short" });
  return statusLabels[text] || text;
}

export default function AdminRecordPreview({ module, id, canUpdate }: { module: ModuleDefinition; id: string | null; canUpdate: boolean }) {
  const [record, setRecord] = useState<RecordValue | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!id) { setRecord(null); return; }
    let active = true;
    setLoading(true);
    fetch(`/api/admin/${module.key}/${encodeURIComponent(id)}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setRecord(data); })
      .catch(() => { if (active) setRecord(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [module.key, id]);
  const title = module.key === "leads" ? String(record?.company || record?.name || "询盘详情")
    : String(record?.name_en || record?.title_en || record?.name_zh || record?.display_name || record?.original_name || module.singular);
  return <aside className="admin-record-preview" aria-label="记录预览">
    {!id ? <div className="admin-preview-empty">选择一条记录查看详情</div> : loading ? <div className="admin-preview-empty">正在加载…</div> : !record ? <div className="admin-preview-empty">暂时无法显示详情</div> : <>
      <div className="admin-preview-head"><span className="admin-preview-kicker">{module.singular}详情</span><h2>{title}</h2>{module.key === "leads" && <span className={`admin-status admin-status-${record.status_id}`}>{display(record.status_id)}</span>}</div>
      {module.key === "leads" ? <>
        <div className="admin-preview-section"><h3>联系信息</h3>
          <p><IconUserCircle size={17} />{display(record.name)}</p>
          <p><IconBuilding size={17} />{display(record.company)}</p>
          <p><IconMapPin size={17} />{display(record.country)}</p>
          <p><IconMail size={17} /><a href={`mailto:${String(record.email || "")}`}>{display(record.email)}</a></p>
          {Boolean(record.phone) && <p><IconPhone size={17} /><a href={`tel:${String(record.phone)}`}>{display(record.phone)}</a></p>}
        </div>
        <div className="admin-preview-section"><h3>咨询内容</h3><dl><div><dt>咨询产品</dt><dd>{display(record.product_interest)}</dd></div><div><dt>提交时间</dt><dd><IconCalendar size={16} />{display(record.submitted_at)}</dd></div></dl><p className="admin-preview-message">{display(record.message)}</p></div>
      </> : <div className="admin-preview-section"><h3>基本信息</h3><dl>{(previewFields[module.key] || module.columns.slice(0, 4).map((key) => ({ key, label: key }))).map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{display(record[field.key])}</dd></div>)}</dl></div>}
      <Link className="admin-primary admin-preview-action" href={`/admin/${module.key}/${id}`}>{canUpdate ? "查看并编辑" : "查看详情"}<IconArrowRight size={17} /></Link>
    </>}
  </aside>;
}
