"use client";

import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/site";

const labels: Record<Locale, string> = { en: "English", ar: "العربية", ru: "Русский", es: "Español" };

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const suffix = pathname.replace(/^\/(en|ar|ru|es)(?=\/|$)/, "") || "";
  return (
    <details className="language-switcher">
      <summary aria-label="Select language"><span aria-hidden="true">◎</span> {labels[locale]} <span className="chevron">⌄</span></summary>
      <div className="language-options">
        {locales.map((item) => <a key={item} href={`/${item}${suffix}`} hrefLang={item} lang={item} aria-current={item === locale ? "page" : undefined}>{labels[item]}</a>)}
      </div>
    </details>
  );
}
