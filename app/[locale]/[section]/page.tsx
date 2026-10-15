import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import InquiryForm from "@/components/InquiryForm";
import LegalDetails from "@/components/LegalDetails";
import { getCopy } from "@/lib/i18n";
import { href, isLocale, type Locale } from "@/lib/site";
import { getContactSettings } from "@/lib/contact-settings";
import { pageMetadata } from "@/lib/seo";

const sectionMap = {
  about: ["aboutTitle", "aboutIntro"],
  "manufacturing-quality": ["qualityTitle", "qualityIntro"],
  "oem-odm": ["oemTitle", "oemIntro"],
  resources: ["resourcesTitle", "resourcesIntro"],
  faq: ["faqTitle", "faqIntro"],
  contact: ["contactPageTitle", "contactPageIntro"],
  "privacy-policy": ["privacyTitle", "privacyIntro"],
  terms: ["termsTitle", "termsIntro"],
} as const;
type Section = keyof typeof sectionMap;
function isSection(value: string): value is Section { return value in sectionMap; }

export async function generateStaticParams() { return ["en", "ar", "ru", "es"].flatMap((locale) => Object.keys(sectionMap).map((section) => ({ locale, section }))); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string; section: string }> }): Promise<Metadata> { const { locale, section } = await params; if (!isLocale(locale) || !isSection(section)) return {}; const c = getCopy(locale); const [title, intro] = sectionMap[section]; return pageMetadata(locale, c[title], c[intro], `/${section}`); }

export default async function SectionPage({ params }: { params: Promise<{ locale: string; section: string }> }) {
  const { locale: raw, section } = await params; if (!isLocale(raw) || !isSection(section)) notFound(); const locale: Locale = raw; const c = getCopy(locale); const [titleKey, introKey] = sectionMap[section];
  const contact = section === "contact" ? await getContactSettings() : null;
  return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c[titleKey] }]} /><p className="eyebrow">MAIGE / {section.toUpperCase().replaceAll("-", " ")}</p><h1>{c[titleKey]}</h1><p>{c[introKey]}</p></div></div><div className="container interior-content">
    {section === "about" && <div className="editorial-grid"><div className="about-logo-panel"><Image src="/images/brand/maige-logo.jpg" width={420} height={420} alt="MAIGE logo" /></div><div><h2>{c.aboutTitle}</h2><p>{c.aboutIntro}</p><p>{c.productIntro}</p><div className="detail-actions"><Link className="button button-blue" href={href(locale, "/products")}>{c.viewProducts}</Link><Link className="button button-outline" href={href(locale, "/contact")}>{c.navContact}</Link></div></div></div>}
    {section === "manufacturing-quality" && <><div className="notice-panel">{c.qualityIntro}</div><div className="card-grid four facility-inner-grid">{[["about",c.aboutCard],["manufacturing",c.manufacturingCard],["corridor",c.facilitiesCard],["office",c.teamCard]].map(([visual,title]) => <div className="facility-card" key={title}><div className={`facility-photo ${visual}`} role="img" aria-label="Illustrative facility visual" /><div><h3>{title}</h3><p>{c.contentPending}</p></div></div>)}</div></>}
    {section === "oem-odm" && <div className="editorial-grid"><div><h2>{c.solutions}</h2><p>{c.oemIntro}</p><ul className="bullet-list"><li>{c.specification}</li><li>{c.productQuestions}</li><li>{c.contactTitle}</li></ul></div><div className="form-panel"><InquiryForm locale={locale} initialProduct="Other" /></div></div>}
    {section === "resources" && <><div className="notice-panel">{c.resourcesIntro}</div><div className="resource-list">{[["catalog", "catalogText"],["datasheets", "datasheetsText"],["notes", "notesText"],["guides", "guidesText"]].map(([title,text]) => <div key={title} className="resource-row"><span className="resource-icon">▤</span><div><h2>{c[title]}</h2><p>{c[text]}</p></div><Link className="mini-button" href={href(locale, "/contact")}>{c.requestFile}</Link></div>)}</div></>}
    {section === "faq" && <div className="faq-list">{[1,2,3,4].map((n) => <details key={n}><summary>{c[`faq${n}q`]}</summary><p>{c[`faq${n}a`]}</p></details>)}</div>}
    {section === "contact" && contact && <div className="editorial-grid contact-page-grid"><div><h2>{c.contactTitle}</h2><p>{c.contactText}</p><a className="button button-green" href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">✆ &nbsp;{c.phoneLabel} ↗</a>{contact.addressUrl && <p><a data-track="address" data-placement="contact_page" href={contact.addressUrl} target="_blank" rel="noopener noreferrer">{contact.addressLabel || "View address"} ↗</a></p>}</div><div className="form-panel"><InquiryForm locale={locale} /></div></div>}
    {section === "privacy-policy" && <LegalDetails locale={locale} kind="privacy" />}
    {section === "terms" && <LegalDetails locale={locale} kind="terms" />}
  </div></div>;
}
