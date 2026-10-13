import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getCopy } from "@/lib/i18n";
import { applications, href, isLocale, type Locale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export async function generateStaticParams() { return ["en", "ar", "ru", "es"].flatMap((locale) => applications.map((item) => ({ locale, slug: item.slug }))); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> { const { locale, slug } = await params; if (!isLocale(locale)) return {}; const item = applications.find((app) => app.slug === slug); if (!item) return {}; const c = getCopy(locale); return pageMetadata(locale, c[item.key], c.applicationsText, `/applications/${slug}`); }

export default async function ApplicationDetail({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params; if (!isLocale(raw)) notFound(); const item = applications.find((app) => app.slug === slug); if (!item) notFound(); const locale: Locale = raw; const c = getCopy(locale);
  return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.applications, path: "/applications" }, { label: c[item.key] }]} /><p className="eyebrow">MAIGE / APPLICATIONS</p><h1>{c[item.key]}</h1><p>{c.applicationsText}</p></div></div><div className="container interior-content"><div className="editorial-grid"><div className={`application-art editorial-art ${item.motif}`}><span aria-hidden="true">{item.motif === "protein" ? "◉" : item.motif === "immunology" ? "✣" : item.motif === "molecular" ? "⌬" : "◌"}</span></div><div><h2>{c.productQuestions}</h2><p>{c.productQuestionText}</p><p>{c.contentPending}</p><div className="detail-actions"><Link className="button button-blue" href={href(locale, "/products")}>{c.viewProducts}</Link><Link className="button button-outline" href={href(locale, "/contact")}>{c.askTechnical}</Link></div></div></div></div></div>;
}
