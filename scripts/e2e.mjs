import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const routes = ["/en", "/ar", "/ru", "/es", "/en/products", "/en/products/dialysis-tubing", "/en/products/elisa-kits", "/en/products/lab-consumables", "/ar/products/lab-consumables", "/ru/products/lab-consumables", "/es/products/lab-consumables", "/en/applications", "/en/about", "/en/manufacturing-quality", "/en/oem-odm", "/en/resources", "/en/blog", "/en/faq", "/en/contact", "/en/privacy-policy", "/en/terms"];

for (const route of routes) {
  const response = await fetch(`${base}${route}`);
  assert.equal(response.status, 200, `${route} should load`);
  const html = await response.text();
  assert.match(html, /<h1[ >]/, `${route} should have an H1`);
  assert.match(html, /wa\.me\/qr\/HLNDA5AQMXHME1/, `${route} should include WhatsApp`);
}
const arabic = await (await fetch(`${base}/ar`)).text();
assert.match(arabic, /<html[^>]*lang="ar"[^>]*dir="rtl"/);
const noResult = await fetch(`${base}/en/products?q=impossible-query-784123`);
assert.equal(noResult.status, 200);
assert.match(await noResult.text(), /No matching product line found/);
const repeated = await fetch(`${base}/en/products?q=Molecular+Biology&q=irrelevant`);
assert.equal(repeated.status, 200);
assert.match(await repeated.text(), /class="mi-search-applications"/);
assert.equal((await fetch(`${base}/en/blog?q=first&q=second`)).status, 200);
assert.equal((await fetch(`${base}/en/contact?document=catalog&document=guides`)).status, 200);
assert.equal((await fetch(`${base}/en/__proto__`)).status, 404);
assert.equal((await fetch(`${base}/en/products/not-real`)).status, 404);
assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Disallow: \//);
console.log(`Passed ${routes.length + 8} local HTTP checks against ${base}`);
