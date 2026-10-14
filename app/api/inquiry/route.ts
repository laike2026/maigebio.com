import { NextResponse } from "next/server";
import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";

export const runtime = "nodejs";

const requests = new Map<string, number[]>();
const fields = ["name", "company", "email", "country", "product", "message"] as const;
const limits = { name: 120, company: 160, email: 254, country: 100, product: 160, message: 4000 } as const;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  if (requests.size > 2000) requests.clear();
  const recent = (requests.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 5) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  recent.push(now);
  requests.set(ip, recent);

  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 12_000) return NextResponse.json({ error: "too_large" }, { status: 413 });
    raw = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  const data = raw as Record<string, unknown>;
  if (typeof data.website === "string" && data.website.trim()) return NextResponse.json({ ok: true });
  for (const field of fields) {
    if (typeof data[field] !== "string" || !data[field].trim() || data[field].length > limits[field]) {
      return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
    }
  }
  const email = String(data.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(email) || String(data.message).trim().length < 10 || data.consent !== "yes") {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }

  const entry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    name: String(data.name).trim(),
    company: String(data.company).trim(),
    email,
    country: String(data.country).trim(),
    product: String(data.product).trim(),
    message: String(data.message).trim(),
    locale: String(data.locale || "en").slice(0, 2),
    sourcePage: String(data.sourcePage || "").slice(0, 500),
    utmSource: String(data.utmSource || "").slice(0, 120),
  };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.VERCEL) return NextResponse.json({ error: "email_unavailable" }, { status: 503 });
    try {
      const dir = join(process.cwd(), ".data");
      await mkdir(dir, { recursive: true });
      await appendFile(join(dir, "inquiries.jsonl"), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
    } catch {
      return NextResponse.json({ error: "storage_error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: entry.id, delivery: "local_only" }, { status: 201 });
  }

  const messageText = [
    `MAIGE website enquiry ${entry.id}`,
    `Received: ${entry.createdAt}`,
    `Name: ${entry.name}`,
    `Company: ${entry.company}`,
    `Email: ${entry.email}`,
    `Country / Region: ${entry.country}`,
    `Product: ${entry.product}`,
    `Language: ${entry.locale}`,
    `Page: ${entry.sourcePage}`,
    `Campaign source: ${entry.utmSource || "(none)"}`,
    "",
    "Message:",
    entry.message,
  ].join("\n");

  try {
    const resend = new Resend(apiKey);
    const { data: sent, error } = await resend.emails.send({
      from: process.env.INQUIRY_FROM_EMAIL || "MAIGE Website <inquiries@maigebio.com>",
      to: [process.env.INQUIRY_TO_EMAIL || "info@maigebio.com"],
      replyTo: entry.email,
      subject: "New MAIGE website enquiry",
      text: messageText,
    });
    if (error || !sent?.id) {
      console.error("Inquiry email delivery failed", error?.name || "missing_message_id");
      return NextResponse.json({ error: "email_delivery_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: entry.id, delivery: "email" }, { status: 201 });
  } catch {
    console.error("Inquiry email delivery failed unexpectedly");
    return NextResponse.json({ error: "email_delivery_failed" }, { status: 502 });
  }
}
