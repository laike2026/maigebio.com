import assert from "node:assert/strict";
import test from "node:test";
import { checkGoogleSearch } from "../lib/google-search-check.ts";

const inputs = { property: "sc-domain:maigebio.com", sitemapUrl: "https://maigebio.com/sitemap.xml", token: "fixture", previous: null };

test("sitemap submission, Google reading and URL inspection stay separate", async () => {
  const calls = [];
  const request = async (url, init) => {
    calls.push([url, init.method ?? "GET"]);
    if (init.method === "PUT") return new Response(null, { status: 204 });
    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      assert.equal(body.siteUrl, inputs.property);
      return Response.json({ inspectionResult: { indexStatusResult: { verdict: body.inspectionUrl.endsWith("/en") ? "PASS" : "NEUTRAL" } } });
    }
    return Response.json({ lastSubmitted: "2026-11-06T01:00:00Z", lastDownloaded: "2026-11-05T09:00:00Z", isPending: true, warnings: "2", errors: "0" });
  };
  const result = await checkGoogleSearch({ ...inputs, submit: true, request });
  assert.deepEqual(calls.slice(0, 3).map(([, method]) => method), ["GET", "PUT", "GET"]);
  assert.ok(result.acceptedAt);
  assert.equal(result.lastDownloaded, "2026-11-05T09:00:00Z");
  assert.equal(result.pending, true);
  assert.equal(result.warnings, 2);
  assert.equal(result.inspection.length, 5);
  assert.equal(result.inspection[0].verdict, "PASS");
  assert.equal(result.inspection[1].verdict, "NEUTRAL");
});

test("read-only Google verification never submits a sitemap", async () => {
  const result = await checkGoogleSearch({
    ...inputs,
    request: async (_url, init) => {
      assert.notEqual(init.method, "PUT");
      return new Response(null, { status: 403 });
    },
  });
  assert.equal(result.acceptedAt, undefined);
  assert.equal(result.readError, "GOOGLE_SITEMAP_HTTP_403");
  assert.ok(result.inspection.every((item) => item.error === "GOOGLE_INSPECT_HTTP_403"));
});
