export type TrackName = "contact_address_click" | "contact_whatsapp_click" | "form_view" | "form_start" | "form_field_complete" | "form_submit_attempt" | "form_submit_success" | "form_submit_failure";

const choiceKey = "maige-analytics-choice";
const sessionKey = "maige-analytics-session";

export function trackEvent(eventName: TrackName, details: { placement?: string; formId?: string; productSlug?: string; fieldName?: string } = {}) {
  if (typeof window === "undefined" || document.querySelector("[data-maige-internal-session]") || localStorage.getItem(choiceKey) !== "accepted") return;
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem(sessionKey, sessionId); }
  const pagePath = window.location.pathname;
  const locale = pagePath.split("/")[1] || "en";
  const payload = {
    eventName, pagePath, placement: details.placement || "", formId: details.formId || "", productSlug: details.productSlug || "",
    fieldName: details.fieldName || undefined, locale, sessionId, eventKey: crypto.randomUUID(), consent: true,
  };
  window.gtag?.("event", eventName, { page_path: pagePath, placement: payload.placement, form_id: payload.formId, product_slug: payload.productSlug, field_name: payload.fieldName });
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/track", blob)) void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
}
