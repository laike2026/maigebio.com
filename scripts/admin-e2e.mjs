import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import ExcelJS from "exceljs";

const root = process.cwd();
const data = join(root, ".data", `admin-e2e-${randomUUID()}`);
const port = 3127;
const base = `http://127.0.0.1:${port}`;
const initialPassword = randomBytes(9).toString("base64url");
const password = randomBytes(24).toString("base64url");
const env = { ...process.env, MAIGE_DATA_DIR: data, ADMIN_EMAIL: "qa-admin@maigebio.local", ADMIN_PASSWORD: initialPassword, ADMIN_ALLOW_SHORT_INITIAL: "YES", ADMIN_NAME: "QA Admin" };

function command(path) {
  const run = spawnSync(process.execPath, [path], { cwd: root, env, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`${path} failed: ${run.stderr.slice(0, 500)}`);
}
command("scripts/db-migrate.mjs");
command("scripts/create-admin.mjs");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: root, env: { ...env, NEXT_PUBLIC_INDEXABLE: "false" }, stdio: ["ignore", "pipe", "pipe"] });
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
  assert.equal((await request("/api/admin/products", "GET", undefined, false)).status, 401);
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "admin", password: "wrong" }, false)).status, 401);
  const firstLogin = await request("/api/admin/auth/login", "POST", { identifier: "admin", password: initialPassword }, false);
  assert.equal(firstLogin.status, 200);
  assert.equal(firstLogin.value.redirect, "/admin/change-password");
  assert.equal((await request("/api/admin/products")).status, 403, "initial password must be changed");
  assert.equal((await request("/api/admin/auth/change-password", "POST", { currentPassword: initialPassword, newPassword: password })).status, 200);
  assert.equal((await request("/api/admin/auth/login", "POST", { identifier: "qa-admin@maigebio.local", password }, false)).status, 200);
  assert.equal((await request("/api/admin/auth/account", "PATCH", { username: "qa-admin", currentPassword: password })).status, 200);
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
  const form = new FormData(); form.append("file", new File([image], "maige-horizontal.png", { type: "image/png" }));
  const media = await request("/api/admin/media/upload", "POST", form); assert.equal(media.status, 201, JSON.stringify(media.value));
  assert.equal((await request(media.value.url)).status, 200);
  const product = await request("/api/admin/products", "POST", {
    name_en: "QA Product", sku: "QA-001", slug: "qa-product", primary_category_id: category.value.id, media_id: media.value.id,
    status: "draft", summary_en: "Research sample", description_html_en: "<p>Safe <strong>content</strong></p><script>alert(1)</script>", seo: { title: "QA Product SEO" },
  });
  assert.equal(product.status, 201, JSON.stringify(product.value));
  assert.equal((await request("/api/public/products/qa-product")).status, 404);
  assert.equal((await request(`/api/admin/products/${product.value.id}`, "PATCH", { status: "published", expectedVersion: product.value.version })).status, 200);
  assert.equal((await request("/api/public/products/qa-product")).status, 200);
  assert.equal((await request(`/api/admin/products/${product.value.id}/relations`, "PUT", { categories: [category.value.id], media: [media.value.id] })).status, 200);
  const relations = await request(`/api/admin/products/${product.value.id}/relations`);
  assert.equal(relations.value.media.length, 1);
  const clone = await request(`/api/admin/products/${product.value.id}/clone`, "POST", {});
  assert.equal(clone.status, 201, JSON.stringify(clone.value)); assert.equal(clone.value.status, "draft");
  assert.equal((await request(`/api/admin/products/${clone.value.id}/relations`)).value.media.length, 1);
  assert.equal((await request(`/api/admin/translations/products/${product.value.id}`, "PUT", { locale: "ar", slug: "qa-product-ar", title: "QA Arabic Product", excerpt: "Arabic summary", html: "<p>Translated</p>", status: "complete", seo: {} })).status, 200);
  assert.equal((await request("/api/public/products/qa-product-ar?locale=ar")).status, 200);
  const history = await request(`/api/admin/products/${product.value.id}/versions`); assert.equal(history.status, 200); assert.ok(history.value.items.length > 0);
  const news = await request("/api/admin/news", "POST", { title_en: "QA News", slug: "qa-news", status: "published", excerpt_en: "A QA article", body_html_en: "<h2>Article</h2><p>Content</p>" });
  assert.equal(news.status, 201, JSON.stringify(news.value));
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

  const lead = await request("/api/inquiry", "POST", {
    name: "QA Visitor", company: "QA Co", email: `qa-${randomUUID()}@example.com`, country: "China", product: "Other",
    message: "Please send detailed product information.", locale: "en", consent: "yes", sourcePage: "/en/contact", website: "",
  }, false);
  assert.equal(lead.status, 201, JSON.stringify(lead.value));
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
  assert.equal((await request("/api/admin/leads/export")).status, 200);
  const queuedExport = await request("/api/admin/export/jobs", "POST", { module: "leads", q: "QA" });
  assert.equal(queuedExport.status, 202, JSON.stringify(queuedExport.value));
  const exportStatus = await request(`/api/admin/export/jobs?id=${queuedExport.value.jobId}`);
  assert.equal(exportStatus.value.status, "succeeded", JSON.stringify(exportStatus.value));
  const exportedCsv = await request(exportStatus.value.download);
  assert.equal(exportedCsv.status, 200); assert.match(exportedCsv.value, /QA/);
  const readonly = await request("/api/admin/users", "POST", { username: "qa-readonly", email: "qa-readonly@maigebio.local", display_name: "QA Readonly", role_id: "readonly", temporary_password: randomBytes(24).toString("base64url") });
  assert.equal(readonly.status, 201, JSON.stringify(readonly.value));
  assert.equal((await request("/api/admin/auth/logout", "POST", {})).status, 200);
  assert.equal((await request("/api/admin/products")).status, 401);
  console.log("Admin API end-to-end flow passed: auth, RBAC, category, media, product relations, translations, import queue, versions, news, lead, analytics, sync, export, logout");
} finally {
  server.kill("SIGINT");
  await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once("exit", resolve); });
  await rm(data, { recursive: true, force: true });
}
