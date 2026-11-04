import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import InquiryForm from "@/components/InquiryForm";
import { getCopy } from "@/lib/i18n";
import { applications, categories, href, isLocale, type Locale } from "@/lib/site";
import { getContactSettings } from "@/lib/contact-settings";
import { pageMetadata } from "@/lib/seo";
import { getSeoSettings } from "@/lib/seo-settings";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) return {};
  const c = getCopy(locale);
  const settings = await getSeoSettings();
  return pageMetadata(locale, settings.homeTitle || `MAIGE | ${c.heroTitle}`, settings.homeDescription || c.heroText);
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; if (!isLocale(raw)) notFound(); const locale: Locale = raw; const c = getCopy(locale);
  const contact = await getContactSettings();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://maigebio.com";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${site}/#organization`, name: "MAIGE Bioscience", url: site, logo: { "@type": "ImageObject", url: `${site}/images/brand/maige-logo.jpg`, width: 578, height: 578 }, email: "info@maigebio.com" },
      { "@type": "WebSite", "@id": `${site}/#website`, name: "MAIGE Bioscience", alternateName: "MAIGE", url: `${site}/`, publisher: { "@id": `${site}/#organization` } },
    ],
  };
  const featured = [
    { title: c.tubingFeature, image: categories[0].image, path: "/products/dialysis-tubing" },
    { title: c.elisaFeature, image: categories[1].image, path: "/products/elisa-kits" },
    { title: c.labConsumables, image: categories[2].image, path: "/products/lab-consumables" },
    { title: c.moreProducts, image: "", path: "/products" },
  ];
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <section className="hero"><div className="hero-glow" aria-hidden="true" /><div className="container hero-inner"><div className="hero-copy"><p className="eyebrow">{c.heroEyebrow}</p><h1>{c.heroTitle}</h1><p className="hero-lead">{c.heroText}</p><form className="hero-search" action={href(locale, "/products")}><select name="category" aria-label={c.allProducts}><option value="">{c.allProducts}</option><option value="dialysis-tubing">{c.dialysis}</option><option value="elisa-kits">{c.elisa}</option><option value="lab-consumables">{c.labConsumables}</option></select><input name="q" type="search" placeholder={c.searchPlaceholder} aria-label={c.search} /><button type="submit" aria-label={c.search}>⌕</button></form><div className="popular"><span>{c.popularSearches}</span><Link href={href(locale, "/products?q=dialysis")}>{c.dialysis}</Link><Link href={href(locale, "/products?q=ELISA")}>ELISA</Link><Link href={href(locale, "/oem-odm")}>OEM/ODM</Link></div><div className="hero-buttons"><Link className="button button-blue" href={href(locale, "/products")}>{c.searchProducts} <span>→</span></Link><Link className="button button-outline" href={href(locale, "/resources")}>▤ &nbsp;{c.requestCatalog}</Link></div></div><div className="hero-art"><div className="building-photo" role="img" aria-label="Illustrative building visual" /><div className="hero-script">Empowering<br />Life Science Research</div></div></div></section>

    <section className="section featured-section"><div className="container">
      <div className="section-heading"><h2>{c.featured}</h2><Link className="text-link" href={href(locale, "/products")}>{c.viewAll} →</Link></div>
      <div className="card-grid four">{featured.map((card) => <article className="featured-card" key={card.path}>
        <Link href={href(locale, card.path)} className="featured-image" aria-label={card.title}>
          {card.image ? <Image src={card.image} width={600} height={600} sizes="(max-width: 650px) 46vw, (max-width: 900px) 45vw, 300px" alt={card.title} /> : <div className="more-products-art" aria-hidden="true"><span className="product-mosaic">{categories.map((item) => <span key={item.slug}><Image src={item.image} width={160} height={160} sizes="120px" alt="" /></span>)}</span><span className="more-products-arrow">↗</span></div>}
        </Link>
        <div className="featured-card-body"><h3><Link href={href(locale, card.path)}>{card.title}</Link></h3><Link className="featured-card-link" href={href(locale, card.path)} aria-label={`${card.title} — ${card.image ? c.viewDetails : c.viewAll}`}>{card.image ? c.viewDetails : c.viewProducts}<span aria-hidden="true">→</span></Link></div>
      </article>)}</div>
    </div></section>

    <section className="why-section"><div className="container"><h2>{c.why}</h2><p className="section-subtitle">{c.whyText}</p><div className="why-grid">{[["⚙",c.advantage1,c.advantage1Text],["◎",c.advantage2,c.advantage2Text],["⬟",c.advantage3,c.advantage3Text],["♧",c.advantage4,c.advantage4Text]].map(([icon,title,text]) => <div className="why-item" key={title}><div className="why-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div></section>

    <section className="section facilities-section"><div className="container"><div className="section-heading"><div><h2>{c.facilities}</h2><p>{c.facilitiesText}</p></div><Link className="text-link" href={href(locale, "/about")}>{c.learnMore} →</Link></div><div className="card-grid four">{[[c.aboutCard,c.aboutCardText,"about","/about"],[c.manufacturingCard,c.manufacturingCardText,"manufacturing","/manufacturing-quality"],[c.facilitiesCard,c.facilitiesCardText,"corridor","/manufacturing-quality"],[c.teamCard,c.teamCardText,"office","/about"]].map(([title,text,visual,path]) => <Link className="facility-card" key={title} href={href(locale, path)}><div className={`facility-photo ${visual}`} role="img" aria-label="Illustrative facility visual" /><div><h3>{title}</h3><p>{text}</p></div></Link>)}</div></div></section>

    <section className="section applications-section"><div className="container"><div className="section-heading"><div><h2>{c.applications}</h2><p>{c.applicationsText}</p></div><Link className="text-link" href={href(locale, "/applications")}>{c.learnMore} →</Link></div><div className="card-grid four application-grid">{applications.map((app) => <Link className="application-card" key={app.slug} href={href(locale, `/applications/${app.slug}`)}><div className={`application-art ${app.motif}`}><span aria-hidden="true">{app.motif === "protein" ? "◉" : app.motif === "immunology" ? "✣" : app.motif === "molecular" ? "⌬" : "◌"}</span></div><h3>{c[app.key]}</h3></Link>)}</div></div></section>

    <section className="section resources-section"><div className="container"><div className="section-heading"><div><h2>{c.resources}</h2><p>{c.resourcesText}</p></div><Link className="text-link" href={href(locale, "/resources")}>{c.learnMore} →</Link></div><div className="card-grid four">{[["▤",c.catalog,c.catalogText],["▤",c.datasheets,c.datasheetsText],["⚗",c.notes,c.notesText],["▣",c.guides,c.guidesText]].map(([icon,title,text]) => <Link href={href(locale, "/resources")} className="resource-card" key={title}><span className="resource-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small><em>{c.requestFile}</em></span></Link>)}</div></div></section>

    <section className="contact-strip home-contact" id="inquiry"><div className="container contact-grid">
      <div className="contact-intro"><p className="eyebrow">MAIGE / CONTACT</p><h2>{c.contactTitle}</h2><p>{c.contactText}</p><div className="home-contact-links"><a href="mailto:info@maigebio.com"><span aria-hidden="true">↗</span>info@maigebio.com</a><a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">↗</span>{c.phoneLabel}</a>{contact.addressUrl && <a data-track="address" data-placement="home_contact" href={contact.addressUrl} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">↗</span>{contact.addressLabel || "View address"}</a>}</div></div>
      <div className="home-inquiry-panel"><InquiryForm locale={locale} /></div>
    </div></section>
  </>;
}
