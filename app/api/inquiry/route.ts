import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { transaction } from "@/lib/db";
import { sendInquiryNotification } from "@/lib/inquiry-notification";
import { requestOriginMatches } from "@/lib/request-origin";

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

export async function POST(request: Request) {
  if (request.headers.has("origin") && !requestOriginMatches(request)) return NextResponse.json({ code: "BAD_ORIGIN" }, { status: 403 });
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
  const email = data.email.toLowerCase();
  const product = data.productName || data.product;
  try {
    const agent = request.headers.get("user-agent") || "";
    const receipt = await transaction(async (tx) => {
      // Serialize retries by email before comparing and creating a lead.
      await tx.query("SELECT pg_advisory_xact_lock(hashtext($1), 1)", [email]);
      const duplicate = await tx.query<{ id: string; notification_status: string }>(`
        SELECT id,notification_status FROM form_submissions
        WHERE lower(email)=$1 AND product_interest=$2 AND message=$3 AND name=$4 AND company=$5
          AND country=$6 AND phone=$7 AND deleted_at IS NULL AND submitted_at>now()-interval '10 minutes'
        ORDER BY submitted_at DESC LIMIT 1`, [email, product, data.message, data.name, data.company, data.country, data.phone]);
      if (duplicate.rows[0]) return { id: duplicate.rows[0].id, sent: duplicate.rows[0].notification_status === "sent", duplicate: true };
      await tx.query("SELECT pg_advisory_xact_lock(hashtext($1), 2)", [ipKey]);
      const recent = await tx.query<{ count: number }>("SELECT count(*)::int AS count FROM form_submissions WHERE ip_hash=$1 AND submitted_at>now()-interval '1 minute'", [ipKey]);
      if ((recent.rows[0]?.count || 0) >= 5) return null;
      const previous = await tx.query<{ id: string }>("SELECT id FROM form_submissions WHERE lower(email)=$1 AND deleted_at IS NULL AND submitted_at>now()-interval '24 hours' ORDER BY submitted_at DESC LIMIT 1", [email]);
      const inserted = await tx.query<{ id: string }>(
        `INSERT INTO form_submissions(form_id,type,name,company,email,phone,country,message,product_interest,source_page,page_url,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,locale,consent,ip_hash,browser,device_type,duplicate_of)
         VALUES('contact','contact',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,$17,$18,$19,$20) RETURNING id`,
        [data.name, data.company, email, data.phone, data.country, data.message, product, data.sourcePage, data.pageUrl, data.referrer, data.utmSource, data.utmMedium, data.utmCampaign, data.utmContent, data.utmTerm, data.locale, ipKey, browserName(agent), deviceType(agent), previous.rows[0]?.id || null]);
      const submissionId = inserted.rows[0].id;
      await tx.query("INSERT INTO sync_jobs(source_id,idempotency_key,status,run_after) VALUES('email_retry',$1,'pending',now()+interval '5 minutes') ON CONFLICT DO NOTHING", [`email:${submissionId}`]);
      await tx.query("INSERT INTO notifications(type,title,body) VALUES('new_lead','收到新询盘',$1)", [`询盘 ${submissionId}`]);
      return { id: submissionId, sent: false, duplicate: false };
    });
    if (!receipt) return NextResponse.json({ code: "RATE_LIMITED" }, { status: 429 });
    const sent = receipt.duplicate ? receipt.sent : await sendInquiryNotification(receipt.id)
      .then((result) => result.ok)
      .catch(() => false);
    return NextResponse.json({ ok: true, id: receipt.id, duplicate: receipt.duplicate, delivery: sent ? "email" : "saved_pending" }, { status: 201 });
  } catch (error) {
    console.error("Inquiry storage failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ code: "STORAGE_UNAVAILABLE", message: "询盘暂时无法接收，请稍后重试" }, { status: 503 });
  }
}
