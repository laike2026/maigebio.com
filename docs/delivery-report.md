# MAIGE 中文管理后台本地交付报告

## 交付状态

`codex/admin-backend` 分支已完成本地开发和验收准备。正式网站仍由 `main` 驱动；本分支没有推送或部署到线上。请通过 `http://127.0.0.1:3001/admin` 查看本机后台，公开网站在 `http://127.0.0.1:3001/en`。

## 已实现

- 中文工作台、登录/重置/会话管理、七类初始角色、页面与 API 权限、审计及软删除恢复。
- 产品/分类、新闻/分类、媒体库、富文本、SEO、关联内容、版本恢复、预览、定时发布、四语言版本和前台数据库读取。既有静态内容继续作为回退。
- CSV/XLSX 导入预览、错误行报告、断点续跑；CSV 分批导出、进度、持久化下载及客户数据下载审计。
- 询盘先入库再邮件通知，状态、负责人、备注、筛选、反垃圾及邮件重试。
- 经访客同意后统计地址点击、WhatsApp 点击、表单展示/开始/字段完成/提交，单独展示数据库真实询盘；未提交字段值不入库。GA4 服务端报表、Search Console 数据适配、SEO 问题扫描及同步中心。
- 后台时区、日期格式、分页大小、上传限制、数据保留、联系链接和 SEO 设置；自动任务、备份/恢复脚本及 Docker Compose 开发环境。

## 架构和主要目录

Next.js 16、React 19、TypeScript；本地 PGlite 持久化，生产 PostgreSQL；本地磁盘媒体，生产 S3 兼容对象存储；Resend 通知；GA4 Data API；定时工作进程。`app/admin` 为后台页面，`app/api/admin` 为管理 API，`components/admin` 为界面，`lib/admin` 为权限和业务逻辑，`db/migrations` 为 SQL 迁移，`scripts` 为迁移、任务、备份和测试命令。

## 数据库

本地已应用 001 至 010 共 **10 个迁移**，建立 **38 张表**，包括用户、角色、会话、登录记录、媒体、产品/分类/翻译/关联、新闻/分类/翻译/关联、询盘/状态/备注、行为事件与日汇总、GA4 与 SEO 指标、重定向、同步任务、通知、审计、设置、导入导出任务及导出块。迁移保留数据，执行前需停止本地服务以释放 PGlite 锁。

## 启动、账号、变量

先执行 `pnpm install && pnpm db:migrate`，再用 `ADMIN_EMAIL`、`ADMIN_NAME`、`ADMIN_PASSWORD` 运行 `pnpm db:create-admin`（至少 14 位，首次登录强制修改）。本机的管理员口令仅在忽略 Git 的 `.secrets/local-admin-password`，不会写入仓库。然后执行 `pnpm dev --port 3001`。部署变量见根目录 `.env.example`；正式站必需 PostgreSQL、S3、`CRON_SECRET`、会话/哈希盐、Resend 和站点 URL。敏感值只能放服务端环境，不可使用 `NEXT_PUBLIC_` 前缀。

Docker 启动：配置未跟踪的 `.env` 中的 PostgreSQL、MinIO 和 Cron 凭证后执行 `docker compose up --build -d`；初始管理员命令见 `README.md`。Docker 本机不可用，因此 Compose 只通过 YAML 解析，尚未容器实测。

## 外部数据源与上线前工作

GA4 属性 `558913614` 可使用已有服务账号凭证；本地开发变量只引用被忽略的凭证文件。Search Console 仍需为服务账号授予站点只读权限并启用 API；未完成前界面会显示未配置/无数据，不会造数。正式 PostgreSQL、S3 bucket、Resend 发信验证和独立调度器需在 **laike2026** 的 Vercel 项目中连接并逐项验收。地址地图链接暂空，等待核实的营业地址。WhatsApp 使用已确认的 `wa.me` 目标，界面只显示短标签。

## 验证结果

- `pnpm test`：通过。
- `pnpm test:admin`：通过；覆盖鉴权、权限、媒体、内容、翻译、关联、CSV/XLSX 导入、505 行分批导出、询盘、追踪、同步和退出。
- `TEST_BASE_URL=http://127.0.0.1:3001 pnpm test:e2e`：21 项前台 HTTP 检查通过。
- `pnpm typecheck`、`pnpm build`、`pnpm audit --audit-level moderate`：通过；依赖审计无已知漏洞。
- 本地数据库备份并恢复至全新目录：通过，恢复库有 10 个迁移。
- 浏览器检查工作台、产品列表、导出和追踪看板：通过。

## 备份与恢复

本地：停止服务后运行 `pnpm db:backup`；设置 `RESTORE_TARGET` 为新空目录后运行 `pnpm db:restore <备份文件>`。生产：使用直接数据库地址运行 `pg_dump`/`pg_restore` 脚本，恢复前需停止写入并设 `RESTORE_CONFIRM=YES`。Docker Compose 包含每日数据库备份与 30 天保留；对象存储需单独做版本化或异地备份。完整步骤见 `docs/admin-operations.md`。

## 已知限制与后续

本次是**本地交付**，未连接正式 PostgreSQL/S3，也未跑真实 S3 直传、Docker 容器或正式 Resend 发信。Search Console 权限尚未配置。历史静态商品/文章和示意图片仍需逐条替换为审核后的真实资料。正式上线前应先接入生产资源、在预览部署检查完整链路、完成备份基线和回滚演练，再由用户一次性验收并决定是否发布。
