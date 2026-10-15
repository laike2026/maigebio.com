"use client";

import { useEffect, useRef, useState, type FormEvent, type FocusEvent } from "react";
import { getCopy } from "@/lib/i18n";
import { href, type Locale } from "@/lib/site";
import Link from "next/link";
import { trackEvent, trackingAllowed } from "@/lib/tracking";

export default function InquiryForm({ locale, initialProduct = "", productName = "" }: { locale: Locale; initialProduct?: string; productName?: string }) {
  const c = getCopy(locale);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "saved_pending" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const viewed = useRef(false);
  const started = useRef(false);
  const completedFields = useRef(new Set<string>());
  const formId = initialProduct ? "product_inquiry" : "contact";

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const report = () => {
      if (viewed.current || !trackingAllowed()) return;
      const rect = form.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) { viewed.current = true; trackEvent("form_view", { formId, productSlug: initialProduct ? initialProduct.toLowerCase().replace(/\s+/g, "-") : "" }); }
    };
    const observer = new IntersectionObserver(report, { threshold: 0.25 });
    observer.observe(form);
    window.addEventListener("maige-analytics-consent", report);
    return () => { observer.disconnect(); window.removeEventListener("maige-analytics-consent", report); };
  }, [formId, initialProduct]);

  function focus(event: FocusEvent<HTMLFormElement>) {
    if (trackingAllowed() && !started.current && event.target instanceof HTMLElement && event.target.closest(".honeypot") === null) {
      started.current = true;
      trackEvent("form_start", { formId });
    }
  }

  function blur(event: FocusEvent<HTMLFormElement>) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    const allowed = ["name", "company", "email", "country", "product", "message", "consent", "phone"];
    if (!trackingAllowed() || !allowed.includes(target.name) || completedFields.current.has(target.name)) return;
    const complete = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value.trim() !== "" && target.checkValidity();
    if (complete) { completedFields.current.add(target.name); trackEvent("form_field_complete", { formId, fieldName: target.name }); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackEvent("form_submit_attempt", { formId });
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch("/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, productName, locale, sourcePage: window.location.pathname, pageUrl: window.location.origin + window.location.pathname, referrer: document.referrer.slice(0, 1000), utmSource: params.get("utm_source") || "", utmMedium: params.get("utm_medium") || "", utmCampaign: params.get("utm_campaign") || "", utmContent: params.get("utm_content") || "", utmTerm: params.get("utm_term") || "" }) });
      if (!response.ok) throw new Error("submit failed");
      const result: { delivery?: string } = await response.json();
      if (result.delivery === "email" || result.delivery === "saved_pending") {
        window.gtag?.("event", "generate_lead", { method: "contact_form" });
        trackEvent("form_submit_success", { formId });
        setStatus(result.delivery === "email" ? "success" : "saved_pending");
      } else {
        throw new Error("delivery unconfirmed");
      }
      form.reset();
    } catch { trackEvent("form_submit_failure", { formId }); setStatus("error"); }
  }

  return <form ref={formRef} className="inquiry-form" onSubmit={submit} onFocusCapture={focus} onBlurCapture={blur} noValidate={false}>
    <div className="form-grid">
      <label>{c.name} <b>*</b><input name="name" required maxLength={120} autoComplete="name" placeholder={c.name} /></label>
      <label>{c.company} <b>*</b><input name="company" required maxLength={160} autoComplete="organization" placeholder={c.company} /></label>
      <label>{c.email} <b>*</b><input name="email" required type="email" maxLength={254} autoComplete="email" placeholder={c.email} /></label>
      <label>{c.country} <b>*</b><input name="country" required maxLength={100} autoComplete="country-name" placeholder={c.country} /></label>
      <label>{c.product} <b>*</b><select name="product" required defaultValue={initialProduct}><option value="">{c.selectProduct}</option><option value="Dialysis Tubing">{c.dialysis}</option><option value="ELISA Kits">{c.elisa}</option><option value="Other">{c.other}</option></select></label>
      <label className="message-field">{c.message} <b>*</b><textarea name="message" rows={3} required minLength={10} maxLength={4000} placeholder={c.message} /></label>
    </div>
    <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <div className="form-bottom"><label className="consent"><input type="checkbox" name="consent" value="yes" required /> {c.consent} <Link href={href(locale, "/privacy-policy")}>{c.privacyTitle}</Link></label><button className="button button-blue" type="submit" disabled={status === "sending"}>{status === "sending" ? c.sending : c.send}</button></div>
    {status === "success" && <p className="form-feedback success" role="status">{c.formSuccess}</p>}
    {status === "saved_pending" && <p className="form-feedback success" role="status">{c.formSuccess}</p>}
    {status === "error" && <p className="form-feedback error" role="alert">{c.formError}</p>}
  </form>;
}
