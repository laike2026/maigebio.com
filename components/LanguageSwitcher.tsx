"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/site";

const labels: Record<Locale, string> = { en: "English", ar: "العربية", ru: "Русский", es: "Español" };

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionsId = useId();
  const suffix = pathname.replace(/^\/(en|ar|ru|es)(?=\/|$)/, "") || "";

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
      <button type="button" ref={buttonRef} aria-label="Select language" aria-expanded={open} aria-controls={optionsId} onClick={() => setOpen(!open)}><span aria-hidden="true">◎</span> {labels[locale]} <span className="chevron" aria-hidden="true">⌄</span></button>
      {open && <div className="language-options" id={optionsId}>
        {locales.map((item) => <a key={item} href={`/${item}${suffix}`} hrefLang={item} lang={item} aria-current={item === locale ? "page" : undefined}>{labels[item]}</a>)}
      </div>}
    </div>
  );
}
