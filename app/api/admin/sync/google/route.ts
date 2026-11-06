import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { getGoogleSearchReceipt, verifyGoogleSearch } from "@/lib/admin/google-search-status";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "sync", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  return Response.json({ receipt: await getGoogleSearchReceipt() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "sync", "sync") || !(await requestOriginAllowed(request))) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  try {
    return Response.json({ receipt: await verifyGoogleSearch() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : "GOOGLE_SEARCH_UNAVAILABLE";
    return Response.json({ code }, { status: 503 });
  }
}
