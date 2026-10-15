import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { query, transaction } from "@/lib/db";

export const runtime = "nodejs";

const submissionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  email: z.email().max(254),
  phone: z.string().max(40).optional().default(""),
  country: z.string().trim().min(1).max(100),
  product: z.string().trim().min(1).max(160),
  productName: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(10).max(4000),
  locale: z.enum(["en", "ar", "ru", "es"]).default("en"),
  consent: z.literal("yes"),
  website: z.string().optional().default(""),
  sourcePage: z.string().max(500).default(""),
  pageUrl: z.string().max(1000).optional().default(""),
  referrer: z.string().max(1000).optional().default(""),
  utmSource: z.string().max(120).optional().default(""),
  utmMedium: z.string().max(120).optional().default(""),
  utmCampaign: z.string().max(120).optional().default(""),
  utmContent: z.string().max(120).optional().default(""),
  utmTerm: z.string().max(120).optional().default(""),
});

type Submission = z.infer<typeof submissionSchema>;
const devSalt = randomBytes(32).toString("hex");

function ipHash(ip: string) {
  const salt = process.env.IP_HASH_SALT || devSalt;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function browserName(agent: string) {
  if (/Edg\//.test(agent)) return "Edge";
  if (/Chrome\//.test(agent)) return "Chrome";
  if (/Firefox\//.test(agent)) return "Firefox";
  if (/Safari\//.test(agent)) return "Safari";
  return "Other";
}

function deviceType(agent: string) { return /Mobile|Android|iPhone/i.test(agent) ? "mobile" : /iPad|Tablet/i.test(agent) ? "tablet" : "desktop"; }

export async function sendInquiryNotification(id: string) {
  const result = await query<{
    id: string; submitted_at: Date; name: string; company: string; email: string; country: string; product_interest: string;
    locale: string; source_page: string; utm_source: string; message: string; notification_status: string;
  }>("SELECT id,submitted_at,name,company,email,country,product_interest,locale,source_page,utm_source,message,notification_status FROM form_submissions WHERE id=$1 AND deleted_at IS NULL", [id]);
  const entry = result.rows[0];
  if (!entry) return { ok: false, error: "not_found" };
  if (entry.notification_status === "sent") return { ok: true, delivery: "already_sent" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "email_not_configured" };
  const messageText = [
    `MAIGE website enquiry ${entry.id}`, `Received: ${new Date(entry.submitted_at).toISOString()}`,
    `Name: ${entry.name}`, `Company: ${entry.company}`, `Email: ${entry.email}`, `Country / Region: ${entry.country}`,
    `Product: ${entry.product_interest}`, `Language: ${entry.locale}`, `Page: ${entry.source_page}`,
    `Campaign source: ${entry.utm_source || "(none)"}`, "", "Message:", entry.message,
  ].join("\n");
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: process.env.INQUIRY_FROM_EMAIL || "MAIGE Website <inquiries@maigebio.com>",
      to: [process.env.INQUIRY_TO_EMAIL || "info@maigebio.com"],
      replyTo: entry.email,
      subject: "New MAIGE website enquiry",
      text: messageText,
      headers: { "X-MAIGE-Inquiry": entry.id },
    });
    if (error || !data?.id) throw new Error(error?.name || "missing_message_id");
    await query("UPDATE form_submissions SET notification_status='sent',notification_attempts=notification_attempts+1,message_id=$2,updated_at=now() WHERE id=$1", [id, data.id]);
    return { ok: true, delivery: "email" };
  } catch (error) {
    console.error("Inquiry email notification failed", error instanceof Error ? error.name : "unknown");
    await query("UPDATE form_submissions SET notification_status='failed',notification_attempts=notification_attempts+1,updated_at=now() WHERE id=$1", [id]);
    return { ok: false, error: "email_failed" };
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && ![request.headers.get("host"), request.headers.get("x-forwarded-host"), new URL(request.url).host].includes(new URL(origin).host)) return NextResponse.json({ code: "BAD_ORIGIN" }, { status: 403 });
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 12_000) return NextResponse.json({ code: "TOO_LARGE" }, { status: 413 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ code: "INVALID_JSON" }, { status: 400 }); }
  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ code: "INVALID_FIELDS", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const data: Submission = parsed.data;
  if (data.website.trim()) return NextResponse.json({ ok: true }, { status: 201 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const ipKey = ipHash(ip);
  try {
    const recent = await query<{ count: number }>("SELECT count(*)::int AS count FROM form_submissions WHERE ip_hash=$1 AND submitted_at>now()-interval '1 minute'", [ipKey]);
    if ((recent.rows[0]?.count || 0) >= 5) return NextResponse.json({ code: "RATE_LIMITED", message: "提交过于频繁，请稍后再试" }, { status: 429 });
    const previous = await query<{ id: string }>("SELECT id FROM form_submissions WHERE lower(email)=lower($1) AND submitted_at>now()-interval '24 hours' ORDER BY submitted_at DESC LIMIT 1", [data.email]);
    const agent = request.headers.get("user-agent") || "";
    const id = await transaction(async (tx) => {
      const inserted = await tx.query<{ id: string }>(
        `INSERT INTO form_submissions(form_id,type,name,company,email,phone,country,message,product_interest,source_page,page_url,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,locale,consent,ip_hash,browser,device_type,duplicate_of)
         VALUES('contact','contact',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,$17,$18,$19,$20) RETURNING id`,
        [data.name, data.company, data.email.toLowerCase(), data.phone, data.country, data.message, data.productName || data.product, data.sourcePage, data.pageUrl, data.referrer, data.utmSource, data.utmMedium, data.utmCampaign, data.utmContent, data.utmTerm, data.locale, ipKey, browserName(agent), deviceType(agent), previous.rows[0]?.id || null]);
      const submissionId = inserted.rows[0].id;
      await tx.query("INSERT INTO sync_jobs(source_id,idempotency_key,status) VALUES('email_retry',$1,'pending') ON CONFLICT DO NOTHING", [`email:${submissionId}`]);
      await tx.query("INSERT INTO notifications(type,title,body) VALUES('new_lead','收到新询盘',$1)", [`询盘 ${submissionId}`]);
      return submissionId;
    });
    const notification = await sendInquiryNotification(id);
    return NextResponse.json({ ok: true, id, delivery: notification.ok ? notification.delivery : "saved_pending" }, { status: 201 });
  } catch (error) {
    console.error("Inquiry storage failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ code: "STORAGE_UNAVAILABLE", message: "询盘暂时无法接收，请稍后重试" }, { status: 503 });
  }
}
