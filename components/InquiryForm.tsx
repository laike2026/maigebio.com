"use client";

import { useState, type FormEvent } from "react";
import { getCopy } from "@/lib/i18n";
import { href, type Locale } from "@/lib/site";
import Link from "next/link";

export default function InquiryForm({ locale, initialProduct = "" }: { locale: Locale; initialProduct?: string }) {
  const c = getCopy(locale);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "local_only" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    try {
      const response = await fetch("/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, locale, sourcePage: window.location.pathname, utmSource: new URLSearchParams(window.location.search).get("utm_source") || "" }) });
      if (!response.ok) throw new Error("submit failed");
      const result: { delivery?: string } = await response.json();
      if (result.delivery === "email") {
        window.gtag?.("event", "generate_lead", { method: "contact_form" });
        setStatus("success");
      } else if (result.delivery === "local_only") {
        setStatus("local_only");
      } else {
        throw new Error("delivery unconfirmed");
      }
      form.reset();
    } catch { setStatus("error"); }
  }

  return <form className="inquiry-form" onSubmit={submit} noValidate={false}>
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
    {status === "local_only" && <p className="form-feedback success" role="status">{c.formLocal}</p>}
    {status === "error" && <p className="form-feedback error" role="alert">{c.formError}</p>}
  </form>;
}
