import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { getSiteHealthReport, runSiteHealth } from "@/lib/admin/site-health";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "sync", "view")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  return Response.json({ report: await getSiteHealthReport() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, "sync", "sync") || !(await requestOriginAllowed(request))) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  return Response.json({ report: await runSiteHealth() }, { headers: { "Cache-Control": "no-store" } });
}
