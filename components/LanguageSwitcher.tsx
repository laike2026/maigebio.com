"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/site";

const labels: Record<Locale, string> = { en: "English", ar: "العربية", ru: "Русский", es: "Español" };

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [destinations, setDestinations] = useState<Partial<Record<Locale, string>>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionsId = useId();
  const suffix = pathname.replace(/^\/(en|ar|ru|es)(?=\/|$)/, "") || "";

  function toggle() {
    if (!open) {
      const base = document.querySelector<HTMLElement>("main [data-content-base]")?.dataset.contentBase || suffix;
      const paths: Partial<Record<Locale, string>> = {};
      for (const item of locales) {
        const alternate = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${item}"]`);
        const url = alternate ? new URL(alternate.href, location.origin) : null;
        paths[item] = url?.origin === location.origin && (url.pathname === `/${item}` || url.pathname.startsWith(`/${item}/`))
          ? url.pathname
          : `/${item}${base}`;
      }
      setDestinations(paths);
    }
    setOpen(!open);
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !open) return;
      event.preventDefault();
      buttonRef.current?.focus();
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="language-switcher" ref={containerRef}>
      <button type="button" ref={buttonRef} aria-label="Select language" aria-expanded={open} aria-controls={optionsId} onClick={toggle}><span aria-hidden="true">◎</span> {labels[locale]} <span className="chevron" aria-hidden="true">⌄</span></button>
      {open && <div className="language-options" id={optionsId}>
        {locales.map((item) => <a key={item} href={destinations[item] || `/${item}${suffix}`} hrefLang={item} lang={item} aria-current={item === locale ? "page" : undefined}>{labels[item]}</a>)}
      </div>}
    </div>
  );
}
