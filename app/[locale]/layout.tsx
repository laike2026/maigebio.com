import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { getCopy } from "@/lib/i18n";
import { isLocale, locales, type Locale } from "@/lib/site";
import "../globals.css";

export function generateStaticParams() { return locales.map((locale) => ({ locale })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = getCopy(locale);
  return { title: { default: `MAIGE | ${c.heroTitle}`, template: `%s | MAIGE` }, description: c.heroText, robots: { index: false, follow: false } };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body><SiteShell locale={locale as Locale}>{children}</SiteShell></body></html>;
}
