import assert from "node:assert/strict";
import { createHash, randomUUID, randomBytes } from "node:crypto";
import { readFile, realpath, rm } from "node:fs/promises";
import { join, sep } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import ExcelJS from "exceljs";
import { PGlite } from "@electric-sql/pglite";

const root = process.cwd();
const data = join(root, ".data", `admin-e2e-${randomUUID()}`);
const port = 3127;
const base = `http://127.0.0.1:${port}`;
const initialPassword = randomBytes(5).toString("base64url");
const password = "1234567";
const resetToken = randomBytes(32).toString("hex");
const env = {
  ...process.env, NODE_ENV: "development", MAIGE_DATA_DIR: data,
  NEXT_PUBLIC_SITE_URL: base, NEXT_PUBLIC_INDEXABLE: "true", NEXT_TELEMETRY_DISABLED: "1",
  DATABASE_URL: "", DATABASE_URL_UNPOOLED: "", RESEND_API_KEY: "", BLOB_READ_WRITE_TOKEN: "",
  S3_BUCKET: "", S3_ENDPOINT: "", S3_ACCESS_KEY_ID: "", S3_SECRET_ACCESS_KEY: "",
  GOOGLE_SERVICE_ACCOUNT_JSON: "", GOOGLE_APPLICATION_CREDENTIALS: "", GA4_PROPERTY_ID: "",
  ADMIN_EMAIL: "qa-admin@maigebio.local", ADMIN_USERNAME: "admin", ADMIN_PASSWORD: initialPassword, ADMIN_NAME: "QA Admin",
};

function command(path) {
  const run = spawnSync(process.execPath, [path], { cwd: root, env, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`${path} failed: ${run.stderr.slice(0, 500)}`);
}
command("scripts/db-migrate.mjs");
command("scripts/create-admin.mjs");
const fixture = new PGlite(join(data, "postgres"));
try {
  await fixture.query("INSERT INTO sync_jobs(source_id,idempotency_key,status,attempt,started_at) VALUES('ga4','qa-interrupted','running',1,now()-interval '10 minutes')");
  await fixture.query("INSERT INTO password_resets(user_id,token_hash,expires_at) SELECT id,$1,now()+interval '1 hour' FROM users WHERE username='admin'", [createHash("sha256").update(resetToken).digest("hex")]);
} finally { await fixture.close(); }
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
server.stdout.on("data", (chunk) => { logs = (logs + chunk.toString()).slice(-4000); });
server.stderr.on("data", (chunk) => { logs = (logs + chunk.toString()).slice(-4000); });

async function waitReady() {
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(`${base}/api/health`); if (response.ok) return; } catch { /* startup */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server not ready: ${logs.slice(-500)}`);
}

let cookie = "";
async function request(path, method = "GET", body, auth = true) {
  const headers = { Origin: base };
  if (auth && cookie) headers.Cookie = cookie;
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`${base}${path}`, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie && setCookie.includes("maige_admin_session=")) cookie = setCookie.split(";")[0];
  const type = response.headers.get("content-type") || "";
  const value = type.includes("json") ? await response.json() : await response.text();
  return { status: response.status, value };
}

try {
  await waitReady();
  assert.equal((await request("/admin", "GET", undefined, false)).status, 307);
  assert.equal((await request("/api/admin/products", "GET", undefined, false)).status, 401);
  assert.equal((await request("/api/admin/media/upload", "POST", new FormData(), false)).status, 401);
  assert.equal((await request("/api/admin/sync/google", "GET", undefined, false)).status, 401);
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "admin", password: "wrong" }, false)).status, 401);
  const firstLogin = await request("/api/admin/auth/login", "POST", { identifier: "admin", password: initialPassword }, false);
  assert.equal(firstLogin.status, 200);
  assert.equal(firstLogin.value.redirect, "/admin/change-password");
  assert.equal((await request("/api/admin/products")).status, 403, "initial password must be changed");
  assert.equal((await request("/api/admin/sync/refresh", "POST", {})).status, 403);
  assert.equal((await request("/api/admin/auth/change-password", "POST", { currentPassword: initialPassword, newPassword: "123456" })).status, 400);
  assert.equal((await request("/api/admin/auth/change-password", "POST", { currentPassword: initialPassword, newPassword: password })).status, 200);
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "qa-admin@maigebio.local", password }, false)).status, 200);
  assert.equal((await request("/api/admin/auth/account", "PATCH", { username: "qa-admin", currentPassword: password })).status, 200);
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "qa-admin", password }, false)).status, 200);
  assert.equal((await request("/api/admin/auth/reset-password", "POST", { token: resetToken, newPassword: "123456" }, false)).status, 400);
  assert.equal((await request("/api/admin/auth/reset-password", "POST", { token: resetToken, newPassword: password }, false)).status, 200);
  assert.equal((await request("/api/admin/products")).status, 401, "reset must revoke the previous session");
  assert.equal((await request("/api/admin/auth/reset-password", "POST", { token: resetToken, newPassword: password }, false)).status, 400, "reset links are single-use");
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "qa-admin", password }, false)).status, 200);
  const longPassword = "x".repeat(520);
  assert.equal((await request("/api/admin/auth/change-password", "POST", { currentPassword: password, newPassword: longPassword })).status, 200);
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "qa-admin@maigebio.local", password: longPassword }, false)).status, 200);
  assert.equal((await request("/api/admin/auth/change-password", "POST", { currentPassword: longPassword, newPassword: password })).status, 200);
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "qa-admin", password }, false)).status, 200);
  assert.equal((await request("/api/admin/auth/forgot-password", "POST", { identifier: "qa-admin" }, false)).status, 200);
  const preferences = (await request("/api/admin/settings")).value.settings.site;
  assert.equal((await request("/api/admin/settings", "PUT", { key: "site", value: { ...preferences, timezone: "UTC", dateFormat: "dd/MM/yyyy", pageSize: 50 } })).status, 200);
  const publicEvent = await request("/api/track", "POST", {
    eventName: "contact_whatsapp_click", pagePath: "/en/contact", placement: "contact_page", locale: "en",
    eventKey: randomUUID(), consent: true,
  }, false);
  assert.equal(publicEvent.status, 202);
  const tracked = await request("/api/admin/analytics?preset=today");
  assert.equal(tracked.status, 200);
  assert.ok(tracked.value.events.some((item) => item.event_name === "contact_whatsapp_click" && item.count === 1));
  const internalEvent = await request("/api/track", "POST", {
    eventName: "contact_whatsapp_click", pagePath: "/en/contact", placement: "contact_page", locale: "en",
    eventKey: randomUUID(), consent: true,
  });
  assert.equal(internalEvent.status, 202);
  assert.equal(internalEvent.value.ignored, true);

  const category = await request("/api/admin/categories", "POST", { name_en: "QA Category", slug: "qa-category", enabled: true });
  assert.equal(category.status, 201, JSON.stringify(category.value));
  const image = await readFile("public/images/brand/maige-horizontal.png");
  const invalidFile = new FormData();
  invalidFile.append("file", new File(["not a PNG"], "wrong.png", { type: "image/png" }));
  assert.ok([400, 415].includes((await request("/api/admin/media/upload", "POST", invalidFile)).status));
  const form = new FormData(); form.append("file", new File([image], "maige-horizontal.png", { type: "image/png" }));
  const media = await request("/api/admin/media/upload", "POST", form); assert.equal(media.status, 201, JSON.stringify(media.value));
  assert.equal((await request(media.value.url)).status, 200);
  const documentForm = new FormData();
  documentForm.append("file", new File(["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"], "qa-datasheet.pdf", { type: "application/pdf" }));
  const datasheet = await request("/api/admin/media/upload", "POST", documentForm);
  assert.equal(datasheet.status, 201);
  const product = await request("/api/admin/products", "POST", {
    name_en: "QA Product", sku: "QA-001", slug: "qa-product", primary_category_id: category.value.id, media_id: media.value.id,
    status: "draft", summary_en: "Research sample", description_html_en: "<p>Safe <strong>content</strong></p><script>alert(1)</script>", seo: { title: "QA Product SEO" },
  });
  assert.equal(product.status, 201, JSON.stringify(product.value));
  assert.equal((await request("/api/public/products/qa-product")).status, 404);
  assert.equal((await request(`/api/admin/products/${product.value.id}`, "PATCH", { status: "published", expectedVersion: product.value.version })).status, 200);
  assert.equal((await request("/api/public/products/qa-product")).status, 200);
  assert.equal((await request(`/api/admin/products/${product.value.id}/relations`, "PUT", { categories: [category.value.id], media: [media.value.id, datasheet.value.id] })).status, 200);
  const relations = await request(`/api/admin/products/${product.value.id}/relations`);
  assert.equal(relations.value.media.length, 2);
  const productWithDownload = await request("/en/products/qa-product", "GET", undefined, false);
  assert.match(productWithDownload.value, /download="qa-datasheet.pdf"/);
  assert.match(productWithDownload.value, /Request technical documents/);
  const clone = await request(`/api/admin/products/${product.value.id}/clone`, "POST", {});
  assert.equal(clone.status, 201, JSON.stringify(clone.value)); assert.equal(clone.value.status, "draft");
  assert.equal((await request(`/api/admin/products/${clone.value.id}/relations`)).value.media.length, 2);
  assert.equal((await request(`/api/admin/translations/products/${product.value.id}`, "PUT", { locale: "ar", slug: "qa-product-ar", title: "QA Arabic Product", excerpt: "Arabic summary", html: "<p>Translated</p>", status: "complete", seo: {} })).status, 200);
  assert.equal((await request("/api/public/products/qa-product-ar?locale=ar")).status, 200);
  const alias = await request("/ar/products/qa-product", "GET", undefined, false);
  assert.equal(alias.status, 308);
  const translated = await request("/ar/products/qa-product-ar", "GET", undefined, false);
  assert.equal(translated.status, 200);
  assert.match(translated.value, /rel="canonical" href="[^"]+\/ar\/products\/qa-product-ar"/);
  assert.match(translated.value, /"@type":"Product"/);
  const spanishFallback = await request("/es/products/qa-product", "GET", undefined, false);
  assert.match(spanishFallback.value, /name="robots" content="noindex, follow"/);
  const publicSitemap = await request("/sitemap.xml", "GET", undefined, false);
  assert.match(publicSitemap.value, /<loc>[^<]+\/ar\/products\/qa-product-ar<\/loc>/);
  assert.doesNotMatch(publicSitemap.value, /<loc>[^<]+\/ar\/products\/qa-product<\/loc>/);
  assert.doesNotMatch(publicSitemap.value, /<loc>[^<]+\/es\/products\/qa-product<\/loc>/);
  const history = await request(`/api/admin/products/${product.value.id}/versions`); assert.equal(history.status, 200); assert.ok(history.value.items.length > 0);
  const currentProduct = await request(`/api/admin/products/${product.value.id}`);
  assert.equal((await request(`/api/admin/products/${product.value.id}`, "PATCH", { expectedVersion: currentProduct.value.version, seo: { noindex: true } })).status, 200);
  const hiddenProduct = await request("/en/products/qa-product", "GET", undefined, false);
  assert.match(hiddenProduct.value, /name="robots" content="noindex, nofollow"/);
  const changedSitemap = await request("/sitemap.xml", "GET", undefined, false);
  assert.doesNotMatch(changedSitemap.value, /<loc>[^<]+\/en\/products\/qa-product<\/loc>/);
  assert.match(changedSitemap.value, /<loc>[^<]+\/ar\/products\/qa-product-ar<\/loc>/);
  const newsInput = { title_en: "QA News", slug: "qa-news", excerpt_en: "A QA article", body_html_en: "<h2>Article</h2><p>Content</p>" };
  assert.equal((await request("/api/admin/news", "POST", { ...newsInput, status: "published" })).status, 400);
  const news = await request("/api/admin/news", "POST", { ...newsInput, status: "draft" });
  assert.equal(news.status, 201, JSON.stringify(news.value));
  assert.equal((await request("/api/public/news/qa-news")).status, 404);
  assert.equal((await request("/en/blog/choosing-dialysis-tubing", "GET", undefined, false)).status, 404, "removed sample article must not be publicly accessible");
  assert.equal((await request(`/api/admin/news/${news.value.id}`, "PATCH", { status: "published", expectedVersion: news.value.version })).status, 400);
  assert.equal((await request(`/api/admin/news/${news.value.id}/publish`, "POST", { expectedVersion: news.value.version })).status, 200);
  assert.equal((await request("/api/public/news/qa-news")).status, 200);
  assert.equal((await request(`/api/admin/news/${news.value.id}/relations`, "PUT", { products: [product.value.id] })).status, 200);
  assert.equal((await request(`/api/admin/news/${news.value.id}/relations`)).value.products.length, 1);
  const importForm = new FormData(); importForm.append("module", "categories"); importForm.append("preview", "false"); importForm.append("file", new File(["name_en,slug,enabled\nQA Imported,qa-imported,true\n"], "categories.csv", { type: "text/csv" }));
  const queuedImport = await request("/api/admin/import", "POST", importForm);
  assert.equal(queuedImport.status, 202, JSON.stringify(queuedImport.value));
  assert.equal((await request("/api/admin/import/jobs", "POST", { id: queuedImport.value.jobId })).status, 200);
  const completedImport = await request(`/api/admin/import/jobs?id=${queuedImport.value.jobId}`);
  assert.equal(completedImport.value.status, "succeeded", JSON.stringify(completedImport.value));
  assert.equal((await request("/api/public/categories/qa-imported")).status, 200);
  const workbook = new ExcelJS.Workbook(); const worksheet = workbook.addWorksheet("Categories"); worksheet.addRow(["name_en", "slug", "enabled"]); worksheet.addRow(["QA Excel", "qa-excel", "true"]);
  const excelBytes = await workbook.xlsx.writeBuffer(); const excelForm = new FormData(); excelForm.append("module", "categories"); excelForm.append("preview", "true"); excelForm.append("file", new File([excelBytes], "categories.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const excelPreview = await request("/api/admin/import", "POST", excelForm); assert.equal(excelPreview.status, 200, JSON.stringify(excelPreview.value)); assert.equal(excelPreview.value.total, 1);
  const manyCsv = "name_en,slug,enabled\n" + Array.from({ length: 505 }, (_, index) => `QA Bulk ${index},qa-bulk-${index},true`).join("\n") + "\n";
  const manyForm = new FormData(); manyForm.append("module", "categories"); manyForm.append("file", new File([manyCsv], "bulk.csv", { type: "text/csv" }));
  const manyImport = await request("/api/admin/import", "POST", manyForm); assert.equal(manyImport.status, 202, JSON.stringify(manyImport.value));
  for (let i = 0; i < 22; i++) {
    const step = await request("/api/admin/import/jobs", "POST", { id: manyImport.value.jobId });
    assert.equal(step.status, 200, JSON.stringify(step.value));
    if (step.value.outcome?.status === "succeeded") break;
  }
  assert.equal((await request(`/api/admin/import/jobs?id=${manyImport.value.jobId}`)).value.status, "succeeded");
  const manyExport = await request("/api/admin/export/jobs", "POST", { module: "categories", q: "QA Bulk" });
  assert.equal(manyExport.status, 202, JSON.stringify(manyExport.value));
  assert.equal((await request(`/api/admin/export/jobs?id=${manyExport.value.jobId}`)).value.status, "pending");
  assert.equal((await request("/api/admin/export/jobs", "POST", { id: manyExport.value.jobId })).value.outcome.status, "succeeded");
  const manyCsvDownload = await request(`/api/admin/export/jobs/${manyExport.value.jobId}/download`);
  assert.equal(manyCsvDownload.status, 200); assert.equal((manyCsvDownload.value.match(/qa-bulk-/g) || []).length, 505);

  const inquiry = {
    name: "QA Visitor", company: "QA Co", email: `qa-${randomUUID()}@example.com`, country: "China", product: "Other",
    message: "Please send detailed product information.", locale: "en", consent: "yes", sourcePage: "/en/contact", website: "",
  };
  const [lead, retry] = await Promise.all([
    request("/api/inquiry", "POST", inquiry, false), request("/api/inquiry", "POST", inquiry, false),
  ]);
  assert.equal(lead.status, 201, JSON.stringify(lead.value));
  assert.equal(retry.status, 201, JSON.stringify(retry.value));
  assert.equal(retry.value.id, lead.value.id);
  assert.equal(Number(retry.value.duplicate) + Number(lead.value.duplicate), 1);
  const different = await request("/api/inquiry", "POST", { ...inquiry, message: "Please send different product specifications." }, false);
  assert.equal(different.status, 201);
  assert.notEqual(different.value.id, lead.value.id);
  const invalidOrigin = await fetch(`${base}/api/inquiry`, { method: "POST", headers: { Origin: "null" } });
  assert.equal(invalidOrigin.status, 403);
  const customStatus = await request("/api/admin/lead_statuses", "POST", { id: "follow-up", name_zh: "待二次跟进", sort_order: 15 });
  assert.equal(customStatus.status, 201, JSON.stringify(customStatus.value));
  assert.equal((await request(`/api/admin/leads/${lead.value.id}`, "PATCH", { status_id: "follow-up" })).status, 200);
  assert.equal((await request(`/api/admin/leads/${lead.value.id}`, "PATCH", { status_id: "contacted" })).status, 200);
  assert.equal((await request(`/api/admin/leads/${lead.value.id}/notes`, "POST", { body: "Called prospect" })).status, 201);
  assert.equal((await request(`/api/admin/leads/${lead.value.id}/notes`)).value.items.length, 1);
  assert.equal((await request("/api/admin/analytics?preset=today")).status, 200);
  const sync = await request("/api/admin/sync/run", "POST", { source: "seo_audit" });
  assert.equal(sync.status, 200, JSON.stringify(sync.value));
  assert.ok(sync.value.results.some((item) => item.source === "seo_audit" && item.status === "succeeded"));
  const retention = await request("/api/admin/sync/run", "POST", { source: "retention_cleanup" });
  assert.equal(retention.status, 200, JSON.stringify(retention.value));
  assert.ok(retention.value.results.some((item) => item.source === "retention_cleanup" && item.status === "succeeded"), JSON.stringify(retention.value));
  assert.equal((await request("/api/admin/sync/jobs")).status, 200);
  const coverage = await request("/api/admin/sync/refresh");
  assert.equal(coverage.status, 200);
  assert.ok(coverage.value.progress.some((item) => item.source === "ga4" && item.coveredThrough === "2026-10-13"));
  assert.equal((await request("/api/admin/sync/refresh", "POST", {})).status, 200);
  const jobs = await request("/api/admin/sync/jobs");
  assert.ok(jobs.value.items.some((item) => item.source_id === "ga4" && item.status === "failed" && item.attempt === 2));
  const report = await request("/api/admin/sync/health", "POST", {});
  assert.equal(report.status, 200);
  assert.ok(report.value.report.checks.some((item) => item.id === "public" && item.state === "ok"), JSON.stringify(report.value.report));
  assert.equal((await request("/api/admin/sync/google")).status, 200);
  assert.equal((await request("/api/admin/sync/google", "POST", {})).status, 503);
  assert.equal((await request("/api/admin/leads/export")).status, 200);
  const queuedExport = await request("/api/admin/export/jobs", "POST", { module: "leads", q: "QA" });
  assert.equal(queuedExport.status, 202, JSON.stringify(queuedExport.value));
  const exportStatus = await request(`/api/admin/export/jobs?id=${queuedExport.value.jobId}`);
  assert.equal(exportStatus.value.status, "succeeded", JSON.stringify(exportStatus.value));
  const exportedCsv = await request(exportStatus.value.download);
  assert.equal(exportedCsv.status, 200); assert.match(exportedCsv.value, /QA/);
  const readonlyInput = { username: "qa-readonly", email: "qa-readonly@maigebio.local", display_name: "QA Readonly", role_id: "readonly" };
  assert.equal((await request("/api/admin/users", "POST", { ...readonlyInput, temporary_password: "123456" })).status, 400);
  const readonlyPassword = " 12345 ";
  const readonly = await request("/api/admin/users", "POST", { ...readonlyInput, temporary_password: readonlyPassword });
  assert.equal(readonly.status, 201, JSON.stringify(readonly.value));
  const salesPassword = randomBytes(8).toString("base64url");
  const sales = await request("/api/admin/users", "POST", { username: "qa-sales", email: "qa-sales@example.com", display_name: "QA Sales", role_id: "sales", temporary_password: salesPassword });
  assert.equal(sales.status, 201);
  const settings = await request("/api/admin/settings");
  assert.equal((await request("/api/admin/settings", "PUT", { key: "seo", value: { ...settings.value.settings.seo, indexingEnabled: false } })).status, 200);
  assert.match((await request("/en", "GET", undefined, false)).value, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch((await request("/robots.txt", "GET", undefined, false)).value, /Sitemap:/);
  assert.doesNotMatch((await request("/sitemap.xml", "GET", undefined, false)).value, /<loc>/);
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "qa-sales", password: salesPassword }, false)).status, 200);
  const nextSalesPassword = randomBytes(8).toString("base64url");
  assert.equal((await request("/api/admin/auth/change-password", "POST", { currentPassword: salesPassword, newPassword: nextSalesPassword })).status, 200);
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "qa-sales", password: nextSalesPassword }, false)).status, 200);
  assert.equal((await request("/api/admin/sync/refresh")).status, 403);
  assert.equal((await request("/api/admin/sync/refresh", "POST", {})).status, 403);
  assert.equal((await request("/api/admin/sync/health", "POST", {})).status, 403);
  assert.equal((await request("/api/admin/auth/logout", "POST", {})).status, 200);
  assert.equal((await request("/api/admin/products")).status, 401);
  const readonlyLogin = await request("/api/admin/auth/login", "POST", { identifier: "qa-readonly", password: readonlyPassword }, false);
  assert.equal(readonlyLogin.status, 200, "password whitespace must be preserved");
  assert.equal(readonlyLogin.value.redirect, "/admin/change-password");
  assert.equal((await request("/api/admin/auth/logout", "POST", {})).status, 200);
  console.log("Admin API end-to-end flow passed: auth, RBAC, category, media, product relations, translations, import queue, versions, news, lead, analytics, sync, export, logout");
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  server.kill("SIGINT");
  await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once("exit", resolve); });
  const [directory, scratch] = await Promise.all([realpath(data), realpath(join(root, ".data"))]);
  if (!directory.startsWith(scratch + sep) || !/^admin-e2e-[a-f0-9-]+$/i.test(directory.slice(scratch.length + 1))) {
    throw new Error("Test data directory escaped its sandbox");
  }
  await rm(directory, { recursive: true, force: true });
}
