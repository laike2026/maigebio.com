import "server-only";
import { GoogleAuth } from "google-auth-library";

type RunReportResponse = { rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[]; totals?: { metricValues?: { value: string }[] }[] };

export function ga4Configured() {
  return Boolean(process.env.GA4_PROPERTY_ID && (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS));
}

export async function ga4Report(body: object): Promise<RunReportResponse> {
  if (!ga4Configured()) throw new Error("GA4_NOT_CONFIGURED");
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : undefined;
  const auth = new GoogleAuth({ credentials, keyFilename: credentials ? undefined : process.env.GOOGLE_APPLICATION_CREDENTIALS, scopes: ["https://www.googleapis.com/auth/analytics.readonly"] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("GA4_TOKEN_UNAVAILABLE");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(process.env.GA4_PROPERTY_ID!)}:runReport`, {
      method: "POST", headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal, cache: "no-store",
    });
    if (!response.ok) throw new Error(`GA4_HTTP_${response.status}`);
    return await response.json() as RunReportResponse;
  } finally { clearTimeout(timer); }
}
