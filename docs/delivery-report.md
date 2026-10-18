# MAIGE 中文管理后台上线交付记录

## 上线状态

2026-10-15 已将管理后台合入 `laike2026/maigebio.com` 的 `main` 分支，由 `laike2026/maigebio-com` 在 Vercel 部署到 [maigebio.com](https://maigebio.com)。管理后台入口为 [maigebio.com/admin/login](https://maigebio.com/admin/login)。部署 `0b4abbb` 在 Vercel 显示 Ready。

## 功能范围

- 独立中文后台；管理员可用账号名或邮箱登录，密码可显示/隐藏，可通过邮箱重置密码，并可在个人账户页修改账号、邮箱和密码。邮箱变更须通过新邮箱的验证链接。初始账号为 `admin`，绑定 `info@maigebio.com`，首次登录强制改密。初始密码由项目负责人提供，仅用于一次性初始化，没有写入 Git 或 Vercel 长期变量。
- 工作台、七类角色、页面与 API 权限、会话管理、审计、内容软删除与恢复。
- 产品与分类、新闻与分类、媒体库、富文本、SEO、关联内容、版本恢复、预览、四语言内容与前台数据库读取；原有静态内容仍作回退。定时发布功能于 2026-10-18 移除。
- CSV/XLSX 导入预览和错误报告、持久化分批导出、询盘入库与邮件通知、状态和备注管理。
- 经访客同意后统计地址点击、WhatsApp 点击及表单展示/开始/字段完成/提交；未提交的字段值不保存。GA4 报表、Search Console 适配、SEO 检查和同步中心。

## 正式资源

- Neon 免费 PostgreSQL `maigebio-admin-db`，仅向该 Vercel 项目的 Production 注入敏感连接变量；已执行 `001` 至 `013` 共 13 个迁移，并创建初始管理员。
- 私有 Vercel Blob `maigebio-media`，仅向 Production 注入读写令牌、存储 ID 和 webhook 公钥。
- `CRON_SECRET`、`IP_HASH_SALT`、`ANALYTICS_HASH_SALT` 在 Production 配置。Vercel 的 Cron Jobs 页面确认 `/api/cron` 每五分钟执行一次且功能已启用。
- Resend、GA4 及站点 URL 沿用项目既有 Production 配置。敏感变量不使用 `NEXT_PUBLIC_` 前缀。

## 验证

- 本地 `pnpm test`、`pnpm test:admin`、`pnpm typecheck`、`pnpm build` 和 `pnpm audit --audit-level moderate` 通过；管理员端到端测试覆盖账号名/邮箱登录、改密、找回与账户设置。
- 正式域名 `/en` 与 `/admin/login` 返回 HTTP 200；`/api/health` 返回 `{"status":"ok","database":"ok"}`。
- 正式站用初始账号登录返回 HTTP 200，随后读取个人账户 API 返回 `admin` 和 `info@maigebio.com`，登录目标为 `/admin/change-password`。浏览器确认密码显示/隐藏开关可切换，忘记密码入口存在。

## 待业务验收与限制

- 首次登录必须由负责人把初始密码改成至少 8 位的新密码。改密之前后台业务权限会拒绝媒体直传等操作；实际媒体上传、询盘通知、定时同步等需在改密后按真实业务流程验收。
- Search Console 的服务账号权限/API 仍待单独配置；营业地址地图链接仍待提供。相应看板会显示未配置或无数据，不会造数。
- Docker/MinIO 方案未在当前机器上做容器实测；正式站使用 Neon 和私有 Vercel Blob。历史静态商品、文章和示意图仍需按已审核的资料逐条更新。
- 生产数据库备份和恢复步骤见 `docs/admin-operations.md`；建议在真实内容录入后执行首份备份并验证恢复流程。

## 2026-10-18 更新

- 新闻和博客取消代码中的示例文章回退。文章只能在后台保存为草稿，再逐篇点击“发布文章”；通用新增、编辑接口不能直接把草稿变为已发布，列表也不再提供新闻批量发布。
- GA4 和 Search Console 改为后台打开时按缺失日期分批补齐，记录完成游标；每日检查一次，仅当上次成功更新距今约 72 小时或积压超过 3 天时执行兜底同步。站内访客点击与表单事件继续即时入库。
- Vercel 定时任务改为每日维护、每日外部数据到期检查、每周一站点地图提交。原每五分钟数据同步已移除。
