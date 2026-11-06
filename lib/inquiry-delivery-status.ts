export function inquiryDeliveryStatus(event: string | null) {
  if (!event) return "unavailable";
  if (["delivered", "opened", "clicked"].includes(event)) return "delivered";
  if (["bounced", "canceled", "complained", "failed", "suppressed"].includes(event)) return "failed";
  return "pending";
}
