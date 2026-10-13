import { NextResponse } from "next/server";
import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
const requests = new Map<string, number[]>();
const fields = ["name", "company", "email", "country", "product", "message"] as const;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now(); const recent = (requests.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 5) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  recent.push(now); requests.set(ip, recent);
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (typeof data.website === "string" && data.website.trim()) return NextResponse.json({ ok: true });
  for (const field of fields) if (typeof data[field] !== "string" || !(data[field] as string).trim()) return NextResponse.json({ error: "missing_field" }, { status: 400 });
  const email = String(data.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || String(data.message).length < 10 || String(data.message).length > 4000 || data.consent !== "yes") return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  const entry = { id: randomUUID(), createdAt: new Date().toISOString(), name: String(data.name).trim().slice(0,120), company: String(data.company).trim().slice(0,160), email, country: String(data.country).trim().slice(0,100), product: String(data.product).trim().slice(0,160), message: String(data.message).trim(), locale: String(data.locale || "en").slice(0,2), sourcePage: String(data.sourcePage || "").slice(0,500), utmSource: String(data.utmSource || "").slice(0,120), status: "new" };
  try { const dir = join(process.cwd(), ".data"); await mkdir(dir, { recursive: true }); await appendFile(join(dir, "inquiries.jsonl"), `${JSON.stringify(entry)}\n`, { mode: 0o600 }); } catch { return NextResponse.json({ error: "storage_error" }, { status: 500 }); }
  return NextResponse.json({ ok: true, id: entry.id, delivery: "local_only" }, { status: 201 });
}
