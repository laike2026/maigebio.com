export type FieldType = "text" | "textarea" | "html" | "number" | "boolean" | "datetime" | "json" | "select" | "email";
export type Field = { key: string; label: string; type: FieldType; required?: boolean; options?: { value: string; label: string }[]; help?: string };
export type ModuleDefinition = { key: string; title: string; table: string; singular: string; search: string[]; columns: string[]; fields: Field[]; softDelete?: boolean; readOnly?: boolean; defaultSort?: string; nav?: boolean };

const contentStates = [
  { value: "draft", label: "草稿" }, { value: "review", label: "待审核" },
  { value: "published", label: "已发布" }, { value: "scheduled", label: "定时发布" },
  { value: "unlisted", label: "已下架" }, { value: "archived", label: "已归档" },
];

export const modules: Record<string, ModuleDefinition> = {
  categories: {
    key: "categories", title: "产品分类", singular: "分类", table: "product_categories", nav: true, softDelete: true,
    search: ["slug", "name_en", "name_zh"], columns: ["name_en", "slug", "parent_id", "enabled", "sort_order", "updated_at"],
    fields: [
      { key: "name_en", label: "英文名称", type: "text", required: true }, { key: "name_zh", label: "中文名称", type: "text" },
      { key: "slug", label: "网址路径", type: "text", required: true }, { key: "parent_id", label: "上级分类", type: "text" },
      { key: "summary_en", label: "英文简介", type: "textarea" }, { key: "description_html_en", label: "英文详细描述", type: "html" },
      { key: "image_id", label: "分类图片", type: "text" }, { key: "icon", label: "图标名称", type: "text" },
      { key: "sort_order", label: "排序值", type: "number" }, { key: "enabled", label: "启用", type: "boolean" },
      { key: "show_in_nav", label: "显示在导航", type: "boolean" }, { key: "seo", label: "搜索展示", type: "json" },
    ],
  },
  products: {
    key: "products", title: "产品管理", singular: "产品", table: "products", nav: true, softDelete: true,
    search: ["sku", "slug", "name_en", "status", "tags"], columns: ["name_en", "sku", "slug", "status", "featured", "updated_at"],
    fields: [
      { key: "name_en", label: "英文名称", type: "text", required: true }, { key: "sku", label: "SKU", type: "text", required: true },
      { key: "slug", label: "网址路径", type: "text", required: true }, { key: "primary_category_id", label: "所属分类", type: "text" },
      { key: "status", label: "发布状态", type: "select", options: contentStates }, { key: "summary_en", label: "英文摘要", type: "textarea" },
      { key: "description_html_en", label: "英文详情", type: "html" },
      { key: "features", label: "核心卖点", type: "json" }, { key: "applications", label: "应用场景", type: "json" },
      { key: "attributes", label: "产品属性", type: "json" }, { key: "specifications", label: "规格表", type: "json" },
      { key: "tags", label: "标签", type: "json" }, { key: "media_id", label: "产品主图", type: "text" },
      { key: "video_url", label: "视频链接", type: "text" }, { key: "minimum_order", label: "最小起订量", type: "text" },
      { key: "lead_time", label: "交货周期", type: "text" },
      { key: "price_mode", label: "价格展示", type: "select", options: [
        { value: "hidden", label: "不显示" }, { value: "fixed", label: "固定价格" }, { value: "range", label: "价格区间" },
        { value: "contact", label: "联系我们" }, { value: "quote", label: "获取报价" },
      ] },
      { key: "price_min", label: "最低价格", type: "number" }, { key: "price_max", label: "最高价格", type: "number" },
      { key: "featured", label: "推荐", type: "boolean" }, { key: "pinned", label: "置顶", type: "boolean" },
      { key: "sort_order", label: "排序值", type: "number" }, { key: "scheduled_at", label: "定时发布时间", type: "datetime" },
      { key: "seo", label: "搜索展示", type: "json" },
    ],
  },
  news_categories: {
    key: "news_categories", title: "新闻分类", singular: "新闻分类", table: "news_categories", nav: true, softDelete: true,
    search: ["slug", "name_en", "name_zh"], columns: ["name_en", "slug", "enabled", "sort_order", "updated_at"],
    fields: [
      { key: "name_en", label: "英文名称", type: "text", required: true }, { key: "name_zh", label: "中文名称", type: "text" },
      { key: "slug", label: "网址路径", type: "text", required: true }, { key: "sort_order", label: "排序值", type: "number" },
      { key: "enabled", label: "启用", type: "boolean" }, { key: "seo", label: "搜索展示", type: "json" },
    ],
  },
  news: {
    key: "news", title: "新闻管理", singular: "文章", table: "news_articles", nav: true, softDelete: true,
    search: ["slug", "title_en", "author", "status", "tags"], columns: ["title_en", "slug", "status", "author", "published_at", "updated_at"],
    fields: [
      { key: "title_en", label: "英文标题", type: "text", required: true }, { key: "slug", label: "网址路径", type: "text", required: true },
      { key: "category_id", label: "新闻分类", type: "text" }, { key: "status", label: "发布状态", type: "select", options: contentStates },
      { key: "excerpt_en", label: "英文摘要", type: "textarea" }, { key: "body_html_en", label: "英文正文", type: "html" },
      { key: "author", label: "作者", type: "text" }, { key: "tags", label: "标签", type: "json" },
      { key: "cover_id", label: "封面图片", type: "text" }, { key: "featured", label: "推荐", type: "boolean" },
      { key: "pinned", label: "置顶", type: "boolean" }, { key: "scheduled_at", label: "定时发布时间", type: "datetime" },
      { key: "seo", label: "搜索展示", type: "json" },
    ],
  },
  leads: {
    key: "leads", title: "客户询盘", singular: "询盘", table: "form_submissions", nav: true, softDelete: true,
    search: ["name", "company", "email", "phone", "country", "product_interest", "status_id", "source_page", "utm_source"],
    columns: ["name", "company", "email", "country", "product_interest", "status_id", "owner_id", "submitted_at"],
    fields: [
      { key: "status_id", label: "跟进状态", type: "select" }, { key: "owner_id", label: "负责人", type: "text" },
      { key: "tags", label: "标签", type: "json" },
    ],
  },
  lead_statuses: { key: "lead_statuses", title: "询盘状态", singular: "状态", table: "lead_statuses", nav: true,
    search: ["id", "name_zh"], columns: ["id", "name_zh", "sort_order", "system_status"],
    fields: [{ key: "id", label: "状态代码", type: "text", required: true }, { key: "name_zh", label: "状态名称", type: "text", required: true }, { key: "sort_order", label: "排序值", type: "number" }],
  },
  media: {
    key: "media", title: "媒体库", singular: "文件", table: "media_assets", nav: true, softDelete: true,
    search: ["original_name", "mime_type", "alt_text"], columns: ["original_name", "mime_type", "size_bytes", "alt_text", "created_at"],
    fields: [{ key: "original_name", label: "显示文件名", type: "text", required: true }, { key: "alt_text", label: "替代文字", type: "text" }, { key: "caption", label: "说明", type: "textarea" }],
  },
  redirects: {
    key: "redirects", title: "重定向", singular: "重定向", table: "redirects", nav: false,
    search: ["source_path", "target_path"], columns: ["source_path", "target_path", "status_code", "enabled", "created_at"],
    fields: [
      { key: "source_path", label: "原路径", type: "text", required: true }, { key: "target_path", label: "目标路径", type: "text", required: true },
      { key: "status_code", label: "状态码", type: "select", options: [{ value: "301", label: "301 永久" }, { value: "302", label: "302 临时" }] },
      { key: "enabled", label: "启用", type: "boolean" },
    ],
  },
  seo_issues: {
    key: "seo_issues", title: "SEO 问题", singular: "问题", table: "seo_issues", nav: false,
    search: ["issue_type", "page_path", "status"], columns: ["issue_type", "severity", "page_path", "status", "detected_at"],
    fields: [{ key: "status", label: "处理状态", type: "select", options: [{ value: "open", label: "待处理" }, { value: "resolved", label: "已解决" }, { value: "ignored", label: "忽略" }] }, { key: "owner_id", label: "负责人", type: "text" }],
  },
  audit: { key: "audit", title: "操作日志", singular: "日志", table: "audit_logs", nav: true, readOnly: true,
    search: ["action", "module", "object_id"], columns: ["action", "module", "object_id", "user_id", "success", "created_at"], fields: [] },
  sync: { key: "sync", title: "数据同步", singular: "数据源", table: "sync_sources", nav: true,
    search: ["id", "name_zh"], columns: ["name_zh", "enabled", "frequency_minutes", "last_success_at", "last_error", "next_run_at"],
    fields: [{ key: "enabled", label: "启用", type: "boolean" }, { key: "frequency_minutes", label: "同步间隔（分钟）", type: "number" }] },
  roles: { key: "roles", title: "角色权限", singular: "角色", table: "roles", nav: true,
    search: ["id", "name_zh"], columns: ["id", "name_zh", "permissions", "system_role", "updated_at"],
    fields: [{ key: "id", label: "角色代码", type: "text", required: true }, { key: "name_zh", label: "角色名称", type: "text", required: true }, { key: "permissions", label: "权限设置", type: "json" }] },
  users: { key: "users", title: "用户管理", singular: "用户", table: "users", nav: true,
    search: ["username", "email", "display_name", "role_id"], columns: ["username", "email", "display_name", "role_id", "active", "last_login_at", "created_at"],
    fields: [{ key: "username", label: "登录账号", type: "text", required: true, help: "3–32 位小写字母、数字、点、下划线或连字符，须以字母开头。" }, { key: "email", label: "邮箱", type: "email", required: true }, { key: "display_name", label: "姓名", type: "text", required: true },
      { key: "role_id", label: "所属角色", type: "text", required: true }, { key: "active", label: "启用", type: "boolean" },
      { key: "temporary_password", label: "初始密码（至少 14 位）", type: "text", help: "仅创建用户时填写；首次登录必须修改。" }],
  },
};

export const fieldLabel = (module: ModuleDefinition, key: string) => module.fields.find((field) => field.key === key)?.label || key;
