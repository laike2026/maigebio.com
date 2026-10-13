import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getCopy } from "@/lib/i18n";
import { applications, href, isLocale, type Locale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const c = getCopy(locale); return pageMetadata(locale, c.applications, c.applicationsText, "/applications"); }

export default async function Applications({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; if (!isLocale(raw)) notFound(); const locale: Locale = raw; const c = getCopy(locale);
  return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.applications }]} /><p className="eyebrow">MAIGE / APPLICATIONS</p><h1>{c.applications}</h1><p>{c.applicationsText}</p></div></div><div className="container interior-content"><div className="application-list">{applications.map((item) => <Link href={href(locale, `/applications/${item.slug}`)} className="application-list-card" key={item.slug}><div className={`application-art ${item.motif}`}><span aria-hidden="true">{item.motif === "protein" ? "◉" : item.motif === "immunology" ? "✣" : item.motif === "molecular" ? "⌬" : "◌"}</span></div><div><h2>{c[item.key]}</h2><p>{c.applicationsText}</p><span className="text-link">{c.learnMore} →</span></div></Link>)}</div></div></div>;
}
