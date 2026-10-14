import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import InquiryForm from "@/components/InquiryForm";
import { getCopy } from "@/lib/i18n";
import { categories, href, isLocale, type Locale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export async function generateStaticParams() { return ["en", "ar", "ru", "es"].flatMap((locale) => categories.map((item) => ({ locale, slug: item.slug }))); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params; if (!isLocale(locale)) return {};
  const item = categories.find((entry) => entry.slug === slug); if (!item) return {};
  const c = getCopy(locale); return pageMetadata(locale, c[item.key], c[`${item.key}Text`], `/products/${slug}`);
}

export default async function ProductGroup({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params; if (!isLocale(raw)) notFound(); const item = categories.find((entry) => entry.slug === slug); if (!item) notFound(); const locale: Locale = raw; const c = getCopy(locale);
  const fields = slug === "dialysis-tubing" ? ["Membrane material", "MWCO", "Flat width / diameter", "Length", "Storage and handling"] : ["Target / analyte", "Species reactivity", "Sample type", "Assay format", "Protocol and storage"];
  const title = c[item.key];
  return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.productCenter, path: "/products" }, { label: title }]} /><p className="eyebrow">MAIGE / PRODUCTS</p><h1>{title}</h1><p>{c[`${item.key}Text`]}</p></div></div><div className="container interior-content"><div className="product-detail-grid"><div className="product-detail-image"><Image src={item.image} width={760} height={570} alt={`${title} illustrative visual`} priority /></div><div className="product-detail-copy"><p className="card-kicker">{c.contentPending}</p><h2>{c.specification}</h2><p>{c.specificationText}</p><ul className="spec-list">{fields.map((field) => <li key={field}><span>{field}</span></li>)}</ul><div className="detail-actions"><a className="button button-blue" href="#product-inquiry">{c.quote}</a><Link className="button button-outline" href={href(locale, "/resources")}>{c.requestInformation}</Link></div></div></div><div className="info-panels"><article><h2>{c.productQuestions}</h2><p>{c.productQuestionText}</p></article><article><h2>{c.related}</h2><Link href={href(locale, "/applications")}>{c.applications} →</Link><Link href={href(locale, "/blog")}>{c.blogTitle} →</Link></article></div><div className="detail-inquiry" id="product-inquiry"><div><h2>{c.askTechnical}</h2><p>{c.contactText}</p></div><InquiryForm locale={locale} initialProduct={slug === "dialysis-tubing" ? "Dialysis Tubing" : "ELISA Kits"} /></div></div></div>;
}
