import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getCopy } from "@/lib/i18n";
import { articles, href, isLocale, type Locale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export async function generateStaticParams() { return ["en", "ar", "ru", "es"].flatMap((locale) => articles.map((item) => ({ locale, slug: item.slug }))); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> { const { locale, slug } = await params; if (!isLocale(locale)) return {}; const item = articles.find((entry) => entry.slug === slug); if (!item) return {}; const c = getCopy(locale); return pageMetadata(locale, c[item.key], c[`${item.key}Text`], `/blog/${slug}`); }

export default async function Article({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params; if (!isLocale(raw)) notFound(); const item = articles.find((entry) => entry.slug === slug); if (!item) notFound(); const locale: Locale = raw; const c = getCopy(locale); const isDialysis = slug === "choosing-dialysis-tubing";
  return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.blogTitle, path: "/blog" }, { label: c[item.key] }]} /><p className="eyebrow">MAIGE / RESEARCH GUIDE</p><h1>{c[item.key]}</h1><p>{c[`${item.key}Text`]}</p></div></div><div className="container interior-content"><article className="article-body"><p className="article-intro">{c[`${item.key}Text`]}</p><h2>{c.productQuestions}</h2><p>{c.productQuestionText}</p><ul className="bullet-list">{(isDialysis ? ["Membrane material", "MWCO", "Width or diameter", "Sample and buffer compatibility", "Required documentation"] : ["Target analyte", "Species reactivity", "Sample type", "Assay format", "Protocol and storage"]).map((field) => <li key={field}>{field}</li>)}</ul><h2>{c.specification}</h2><p>{c.specificationText}</p><div className="article-cta"><h2>{c.askTechnical}</h2><p>{c.contentPending}</p><Link className="button button-blue" href={href(locale, isDialysis ? "/products/dialysis-tubing" : "/products/elisa-kits")}>{c.viewProducts}</Link><Link className="button button-outline" href={href(locale, "/contact")}>{c.quote}</Link></div></article></div></div>;
}
