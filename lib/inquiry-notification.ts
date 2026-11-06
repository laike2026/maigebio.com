import "server-only";
import { Resend } from "resend";
import { query } from "@/lib/db";

export async function sendInquiryNotification(id: string) {
  const result = await query<{
    id: string; submitted_at: Date; name: string; company: string; email: string; country: string;
    product_interest: string; locale: string; source_page: string; utm_source: string; message: string;
    notification_status: string; notification_attempts: number;
  }>(`SELECT id,submitted_at,name,company,email,country,product_interest,locale,source_page,utm_source,message,
       notification_status,notification_attempts FROM form_submissions WHERE id=$1 AND deleted_at IS NULL`, [id]);
  const entry = result.rows[0];
  if (!entry) return { ok: false, error: "not_found" };
  if (entry.notification_status === "sent") return { ok: true };
  if (entry.notification_attempts >= 5) return { ok: false, error: "email_retry_limit" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "email_not_configured" };
  const message = [
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
      text: message,
      headers: { "X-MAIGE-Inquiry": entry.id },
    }, { idempotencyKey: `inquiry/${entry.id}` });
    if (error || !data?.id) throw new Error(error?.name || "missing_message_id");
    await query(`UPDATE form_submissions SET notification_status='sent',notification_attempts=notification_attempts+1,
      message_id=$2,updated_at=now() WHERE id=$1 AND notification_status<>'sent'`, [id, data.id]);
    return { ok: true };
  } catch (error) {
    console.error("Inquiry email notification failed", error instanceof Error ? error.name : "unknown");
    await query(`UPDATE form_submissions SET notification_status='failed',notification_attempts=notification_attempts+1,
      updated_at=now() WHERE id=$1 AND notification_status<>'sent'`, [id]);
    return { ok: false, error: "email_failed" };
  }
}
