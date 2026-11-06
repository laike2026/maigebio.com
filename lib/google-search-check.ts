const inspectedPaths = ["/en", "/en/products", "/en/products/dialysis-tubing", "/en/products/elisa-kits", "/en/products/lab-consumables"];

export type GoogleSearchReceipt = {
  property: string;
  sitemapUrl: string;
  checkedAt: string;
  acceptedAt?: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  pending?: boolean;
  errors?: number;
  warnings?: number;
  readError?: string;
  inspection: Array<{ path: string; verdict?: string; coverage?: string; lastCrawl?: string; error?: string }>;
};

export async function checkGoogleSearch({
  property, sitemapUrl, token, previous, submit = false, request = fetch,
}: {
  property: string;
  sitemapUrl: string;
  token: string;
  previous: GoogleSearchReceipt | null;
  submit?: boolean;
  request?: typeof fetch;
}): Promise<GoogleSearchReceipt> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  const auth = { Authorization: `Bearer ${token}` };
  const google = (url: string, init?: RequestInit) => request(url, {
    ...init, cache: "no-store", signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  let acceptedAt = previous?.acceptedAt;
  let response = await google(endpoint, { headers: auth });
  if (submit) {
    const accepted = await google(endpoint, { method: "PUT", headers: auth });
    if (!accepted) throw new Error("GOOGLE_SITEMAP_UNAVAILABLE");
    if (!accepted.ok) throw new Error(`GOOGLE_SITEMAP_HTTP_${accepted.status}`);
    acceptedAt = new Date().toISOString();
    response = await google(endpoint, { headers: auth });
  }
  const result = response?.ok ? await response.json().catch(() => null) as Record<string, unknown> | null : null;
  const inspection = await Promise.all(inspectedPaths.map(async (path) => {
    const check = await google("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl: property, inspectionUrl: new URL(path, sitemapUrl).toString(), languageCode: "en-US" }),
    });
    if (!check) return { path, error: "GOOGLE_INSPECT_UNAVAILABLE" };
    if (!check.ok) return { path, error: `GOOGLE_INSPECT_HTTP_${check.status}` };
    const body = await check.json().catch(() => null);
    const index = body?.inspectionResult?.indexStatusResult;
    if (!index) return { path, error: "GOOGLE_INSPECT_EMPTY" };
    return { path, verdict: String(index.verdict || "").slice(0, 30), coverage: String(index.coverageState || "").slice(0, 160), lastCrawl: index.lastCrawlTime };
  }));
  return {
    property, sitemapUrl, checkedAt: new Date().toISOString(), acceptedAt,
    lastSubmitted: typeof result?.lastSubmitted === "string" ? result.lastSubmitted : previous?.lastSubmitted,
    lastDownloaded: typeof result?.lastDownloaded === "string" ? result.lastDownloaded : previous?.lastDownloaded,
    pending: result ? result.isPending === true : previous?.pending,
    errors: result ? Number(result.errors || 0) : previous?.errors,
    warnings: result ? Number(result.warnings || 0) : previous?.warnings,
    readError: result ? undefined : response ? `GOOGLE_SITEMAP_HTTP_${response.status}` : "GOOGLE_SITEMAP_UNAVAILABLE",
    inspection,
  };
}
