"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/tracking";

export default function ContactClickTracker() {
  useEffect(() => {
    function click(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = anchor.href;
      if (url.startsWith("https://wa.me/")) {
        const placement = anchor.closest(".topbar") ? "topbar" : anchor.classList.contains("whatsapp-float") ? "floating" : anchor.closest(".site-footer") ? "footer" : anchor.closest(".contact-strip") ? "home_contact" : anchor.closest(".contact-page-grid") ? "contact_page" : "other";
        trackEvent("contact_whatsapp_click", { placement });
      } else if (anchor.dataset.track === "address") trackEvent("contact_address_click", { placement: anchor.dataset.placement || "contact_page" });
    }
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, []);
  return null;
}
