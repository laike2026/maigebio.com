import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const routes = ["/en", "/ar", "/ru", "/es", "/en/products", "/en/products/dialysis-tubing", "/en/products/elisa-kits", "/en/applications", "/en/about", "/en/manufacturing-quality", "/en/oem-odm", "/en/resources", "/en/blog", "/en/faq", "/en/contact", "/en/privacy-policy", "/en/terms"];

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
assert.equal((await fetch(`${base}/en/products/not-real`)).status, 404);
assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Disallow: \//);
console.log(`Passed ${routes.length + 4} local HTTP checks against ${base}`);
