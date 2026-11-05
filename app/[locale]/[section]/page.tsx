import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IconBrandWhatsapp, IconPlus } from "@tabler/icons-react";
import Breadcrumb from "@/components/Breadcrumb";
import InquiryForm from "@/components/InquiryForm";
import LegalDetails from "@/components/LegalDetails";
import { interiorCopy } from "@/lib/interior-copy";
import { categories, href, isLocale } from "@/lib/site";
import { getContactSettings } from "@/lib/contact-settings";
import { pageMetadata } from "@/lib/seo";
import {
  art,
  InteriorHero,
  ProductCard,
  productArt,
  ResourceRows,
  ScienceIcon,
  SupportCTA,
  Workflow,
  type IconName,
} from "@/components/interiors/Interior";
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
function isSection(value: string): value is Section {
  return value in sectionMap;
}
export async function generateStaticParams() {
  return ["en", "ar", "ru", "es"].flatMap((locale) =>
    Object.keys(sectionMap).map((section) => ({ locale, section })),
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; section: string }>;
}): Promise<Metadata> {
  const { locale, section } = await params;
  if (!isLocale(locale) || !isSection(section)) return {};
  const c = interiorCopy(locale);
  const [title, intro] = sectionMap[section];
  return pageMetadata(locale, c[title], c[intro], `/${section}`);
}
export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; section: string }>;
  searchParams: Promise<{ q?: string; document?: string }>;
}) {
  const { locale, section } = await params;
  if (!isLocale(locale) || !isSection(section)) notFound();
  const c = interiorCopy(locale);
  const [titleKey, introKey] = sectionMap[section];
  const { q = "", document: documentKey = "" } = await searchParams;
  const contact = section === "contact" ? await getContactSettings() : null;
  const legal = section === "privacy-policy" || section === "terms";
  const title =
    section === "about"
      ? c.aboutHeading
      : section === "manufacturing-quality"
        ? c.qualityHeading
        : section === "contact"
          ? c.contactHeading
          : section === "faq"
            ? c.faqHeading
            : c[titleKey];
  const featureItems = [
    ["faqSelection", "flask"],
    ["documentation", "document"],
    ["communication", "support"],
  ] as const;
  return (
    <div className="mi-page">
      {section === "about" ? (
        <>
          <div className="container mi-breadcrumb">
            <Breadcrumb locale={locale} items={[{ label: c.aboutTitle }]} />
          </div>
          <header className="container mi-split mi-about-hero">
            <div>
              <h1>{title}</h1>
              <p>{c.aboutIntro}</p>
            </div>
            <div className="mi-logo-panel">
              <Image
                src="/images/brand/maige-horizontal.png"
                alt="MAIGE"
                width={760}
                height={210}
                priority
              />
            </div>
          </header>
        </>
      ) : (
        <InteriorHero
          locale={locale}
          title={title}
          intro={c[introKey]}
          image={legal ? null : section === "oem-odm" ? "elisa-product" : "lab-hero"}
          compact={legal}
          crumbs={[{ label: c[titleKey] }]}
        />
      )}
      <div className="container mi-content">
        {section === "about" && (
          <>
            <section className="mi-section">
              <h2>{c.ourFocus}</h2>
              <div className="mi-product-grid">
                {categories.map((x) => (
                  <ProductCard
                    locale={locale}
                    key={x.slug}
                    title={c[x.key]}
                    summary={c[x.key + "Text"]}
                    image={art(productArt[x.slug])}
                    path={`/products/${x.slug}`}
                  />
                ))}
              </div>
            </section>
            <section className="mi-split mi-section">
              <Image className="mi-photo" src={art("molecular-hero")} alt="" width={800} height={450} />
              <div>
                <h2>{c.applications}</h2>
                <p>{c.applicationsText}</p>
                <Link className="mi-text-link" href={href(locale, "/applications")}>
                  {c.learnMore}
                  <ScienceIcon name="arrow" size={19} />
                </Link>
              </div>
            </section>
            <section className="mi-feature-list">
              {featureItems.map(([key, icon]) => (
                <div key={key}>
                  <ScienceIcon name={icon} size={40} />
                  <div>
                    <h3>{c[key]}</h3>
                    <p>{c.supportText}</p>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
        {section === "manufacturing-quality" && (
          <>
            <Workflow
              title={c.qualityTitle}
              items={[
                { title: c.requirements, icon: "review" },
                { title: c.review, icon: "microscope" },
                { title: c.documentation, icon: "document" },
                { title: c.handling, icon: "flask" },
              ]}
            />
            <section className="mi-section">
              <h2>{c.qualityDocs}</h2>
              <ResourceRows locale={locale} />
            </section>
            <section className="mi-split">
              <div>
                <h2>{c.documentation}</h2>
                <p>{c.qualityIntro}</p>
                <p>{c.supportText}</p>
              </div>
              <Image className="mi-photo" src={art("lab-hero")} alt="" width={800} height={450} />
            </section>
          </>
        )}
        {section === "oem-odm" && (
          <>
            <Workflow
              title={c.oemProcess}
              items={[
                { title: c.requirements, icon: "review" },
                { title: c.review, icon: "flask" },
                { title: c.sampling, icon: "sample" },
                { title: c.confirmation, icon: "shield" },
                { title: c.supply, icon: "package" },
              ]}
            />
            <section className="mi-split mi-split-top">
              <div>
                <h2>{c.requirementsList}</h2>
                <p>{c.oemIntro}</p>
                <ul className="mi-considerations">
                  {[
                    ["product", "flask"],
                    ["specifications", "dna"],
                    ["packaging", "package"],
                    ["documentation", "document"],
                  ].map(([key, icon]) => (
                    <li key={key}>
                      <ScienceIcon name={icon as IconName} size={35} />
                      <div>
                        <h3>{c[key]}</h3>
                        <p>{c.supportText}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mi-contact-form">
                <h2>{c.sendEnquiry}</h2>
                <InquiryForm locale={locale} initialProduct="Other" />
              </div>
            </section>
          </>
        )}
        {section === "resources" && (
          <>
            <form action={href(locale, "/resources")} className="mi-search">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={c.resourceSearch}
                aria-label={c.resourceSearch}
              />
              <button className="button button-blue">{c.search}</button>
            </form>
            {q && (
              <p>
                <Link className="mi-text-link" href={href(locale, "/resources")}>
                  {c.clearSearch}
                </Link>
              </p>
            )}
            <ResourceRows locale={locale} query={q} />
          </>
        )}
        {section === "faq" && (
          <div className="mi-faq-layout">
            <aside className="mi-sidebar">
              <h2>{c.faqTitle}</h2>
              <a href="#selection">{c.faqSelection}</a>
              <a href="#documentation">{c.faqOther}</a>
            </aside>
            <div className="mi-faq-list">
              {[1, 2, 3, 4].map((n) => (
                <details
                  open={n === 1}
                  id={n === 1 ? "selection" : n === 3 ? "documentation" : undefined}
                  key={n}
                >
                  <summary>
                    <IconPlus size={23} aria-hidden="true" />
                    {c[`faq${n}q`]}
                  </summary>
                  <p>{c[`faq${n}a`]}</p>
                </details>
              ))}
            </div>
          </div>
        )}
        {section === "contact" && contact && (
          <div className="mi-contact-layout">
            <div>
              <div className="mi-contact-method">
                <ScienceIcon name="mail" size={48} />
                <div>
                  <h2>{c.emailUs}</h2>
                  <a href="mailto:info@maigebio.com">info@maigebio.com</a>
                </div>
              </div>
              <div className="mi-contact-method">
                <IconBrandWhatsapp size={48} stroke={1.5} aria-hidden="true" />
                <div>
                  <h2>{c.whatsapp}</h2>
                  <a
                    className="button button-outline"
                    href={contact.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {c.phoneLabel}
                  </a>
                </div>
              </div>
              {contact.addressUrl && (
                <p>
                  <a
                    data-track="address"
                    data-placement="contact_page"
                    className="mi-text-link"
                    href={contact.addressUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {contact.addressLabel}
                  </a>
                </p>
              )}
              <h3>{c.pleaseShare}</h3>
              <ul className="mi-considerations">
                {["product", "specifications", "applications"].map((key) => (
                  <li key={key}>
                    <ScienceIcon name="review" size={23} />
                    <span>{c[key]}</span>
                  </li>
                ))}
              </ul>
              <Image src={art("lab-hero")} alt="" width={700} height={394} className="mi-contact-art" />
            </div>
            <div className="mi-contact-form">
              <h2>{c.sendEnquiry}</h2>
              <InquiryForm
                locale={locale}
                initialProduct={documentKey ? "Other" : ""}
                initialMessage={
                  ["catalog", "datasheets", "notes", "guides"].includes(documentKey)
                    ? c[documentKey]
                    : ""
                }
              />
            </div>
          </div>
        )}
        {legal && (
          <div className="mi-legal-layout">
            <aside className="mi-sidebar">
              <h2>{c.reading}</h2>
              <a href="#legal-copy">{c[titleKey]}</a>
              <Link href={href(locale, "/contact")}>{c.navContact}</Link>
              <Link href={href(locale, section === "terms" ? "/privacy-policy" : "/terms")}>
                {section === "terms" ? c.privacyTitle : c.termsTitle}
              </Link>
            </aside>
            <div id="legal-copy">
              <LegalDetails locale={locale} kind={section === "terms" ? "terms" : "privacy"} />
            </div>
          </div>
        )}
        {!legal && section !== "contact" && section !== "oem-odm" && (
          <SupportCTA locale={locale} title={section === "resources" ? c.documentHelp : undefined} />
        )}
      </div>
    </div>
  );
}
