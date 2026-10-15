import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import InquiryForm from "@/components/InquiryForm";
import { getCopy } from "@/lib/i18n";
import { applications, categories, href, isLocale, type Locale, whatsappUrl } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) return {};
  const c = getCopy(locale);
  return pageMetadata(locale, `MAIGE | ${c.heroTitle}`, c.heroText);
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; if (!isLocale(raw)) notFound(); const locale: Locale = raw; const c = getCopy(locale);
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://maigebio.com";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${site}/#organization`, name: "MAIGE Bioscience", url: site, logo: { "@type": "ImageObject", url: `${site}/images/brand/maige-logo.jpg`, width: 578, height: 578 }, email: "info@maigebio.com" },
      { "@type": "WebSite", "@id": `${site}/#website`, name: "MAIGE Bioscience", alternateName: "MAIGE", url: `${site}/`, publisher: { "@id": `${site}/#organization` } },
    ],
  };
  const categoryCards = [
    { title: c.dialysis, text: c.dialysisText, image: categories[0].image, path: "/products/dialysis-tubing" },
    { title: c.elisa, text: c.elisaText, image: categories[1].image, path: "/products/elisa-kits" },
    { title: c.reagents, text: c.reagentsText, image: "", path: "/contact" },
    { title: c.solutions, text: c.solutionsText, image: "", path: "/oem-odm" },
  ];
  const featured = [
    { title: c.tubingFeature, text: c.tubingFeatureText, image: categories[0].image, path: "/products/dialysis-tubing" },
    { title: c.tubingSupport, text: c.tubingSupportText, image: categories[0].image, path: "/products/dialysis-tubing" },
    { title: c.elisaFeature, text: c.elisaFeatureText, image: categories[1].image, path: "/products/elisa-kits" },
    { title: c.elisaSupport, text: c.elisaSupportText, image: categories[1].image, path: "/products/elisa-kits" },
  ];
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <section className="hero"><div className="hero-glow" aria-hidden="true" /><div className="container hero-inner"><div className="hero-copy"><p className="eyebrow">{c.heroEyebrow}</p><h1>{c.heroTitle}</h1><p className="hero-lead">{c.heroText}</p><form className="hero-search" action={href(locale, "/products")}><select name="category" aria-label={c.allProducts}><option value="">{c.allProducts}</option><option value="dialysis-tubing">{c.dialysis}</option><option value="elisa-kits">{c.elisa}</option></select><input name="q" type="search" placeholder={c.searchPlaceholder} aria-label={c.search} /><button type="submit" aria-label={c.search}>⌕</button></form><div className="popular"><span>{c.popularSearches}</span><Link href={href(locale, "/products?q=dialysis")}>{c.dialysis}</Link><Link href={href(locale, "/products?q=ELISA")}>ELISA</Link><Link href={href(locale, "/oem-odm")}>OEM/ODM</Link></div><div className="hero-buttons"><Link className="button button-blue" href={href(locale, "/products")}>{c.searchProducts} <span>→</span></Link><Link className="button button-outline" href={href(locale, "/resources")}>▤ &nbsp;{c.requestCatalog}</Link></div></div><div className="hero-art"><div className="building-photo" role="img" aria-label="Illustrative building visual" /><div className="hero-script">Empowering<br />Life Science Research</div><div className="hero-badges"><div>♧ <span>{c.reliable}</span></div><div>⚙ <span>{c.flexible}</span></div><div>◎ <span>{c.global}</span></div><div>◇ <span>{c.support}</span></div></div></div></div></section>

    <section className="section categories-section"><div className="container"><div className="section-heading"><div><h2>{c.browse}</h2><p>{c.browseText}</p></div></div><div className="card-grid four">{categoryCards.map((card, i) => <article className="category-card" key={card.title}><Link className="category-image" href={href(locale, card.path)} aria-label={card.title}>{card.image ? <Image src={card.image} width={360} height={210} alt="" /> : i === 2 ? <div className="technical-art"><span>⚗</span></div> : <div className="solution-art"><span>⌬</span><span>◌</span><span>✦</span></div>}</Link><div className="category-body"><h3>{card.title}</h3><p>{card.text}</p><Link href={href(locale, card.path)}>{i >= 2 ? c.learnMore : c.viewProducts} <span>→</span></Link></div></article>)}</div></div></section>

    <section className="section featured-section"><div className="container"><div className="section-heading"><div><h2>{c.featured}</h2><p>{c.featuredText}</p></div><Link className="text-link" href={href(locale, "/products")}>{c.viewAll} →</Link></div><div className="card-grid four">{featured.map((card) => <article className="featured-card" key={card.title}><Link href={href(locale, card.path)} className="featured-image"><Image src={card.image} width={400} height={230} alt="" /></Link><h3>{card.title}</h3><p>{card.text}</p><Link className="mini-button" href={href(locale, card.path)}>{c.viewDetails}</Link></article>)}</div></div></section>

    <section className="why-section"><div className="container"><h2>{c.why}</h2><p className="section-subtitle">{c.whyText}</p><div className="why-grid">{[["⚙",c.advantage1,c.advantage1Text],["◎",c.advantage2,c.advantage2Text],["⬟",c.advantage3,c.advantage3Text],["♧",c.advantage4,c.advantage4Text]].map(([icon,title,text]) => <div className="why-item" key={title}><div className="why-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div></section>

    <section className="section facilities-section"><div className="container"><div className="section-heading"><div><h2>{c.facilities}</h2><p>{c.facilitiesText}</p></div><Link className="text-link" href={href(locale, "/about")}>{c.learnMore} →</Link></div><div className="card-grid four">{[[c.aboutCard,c.aboutCardText,"about","/about"],[c.manufacturingCard,c.manufacturingCardText,"manufacturing","/manufacturing-quality"],[c.facilitiesCard,c.facilitiesCardText,"corridor","/manufacturing-quality"],[c.teamCard,c.teamCardText,"office","/about"]].map(([title,text,visual,path]) => <Link className="facility-card" key={title} href={href(locale, path)}><div className={`facility-photo ${visual}`} role="img" aria-label="Illustrative facility visual" /><div><h3>{title}</h3><p>{text}</p></div></Link>)}</div></div></section>

    <section className="section applications-section"><div className="container"><div className="section-heading"><div><h2>{c.applications}</h2><p>{c.applicationsText}</p></div><Link className="text-link" href={href(locale, "/applications")}>{c.learnMore} →</Link></div><div className="card-grid four application-grid">{applications.map((app) => <Link className="application-card" key={app.slug} href={href(locale, `/applications/${app.slug}`)}><div className={`application-art ${app.motif}`}><span aria-hidden="true">{app.motif === "protein" ? "◉" : app.motif === "immunology" ? "✣" : app.motif === "molecular" ? "⌬" : "◌"}</span></div><h3>{c[app.key]}</h3></Link>)}</div></div></section>

    <section className="section resources-section"><div className="container"><div className="section-heading"><div><h2>{c.resources}</h2><p>{c.resourcesText}</p></div><Link className="text-link" href={href(locale, "/resources")}>{c.learnMore} →</Link></div><div className="card-grid four">{[["▤",c.catalog,c.catalogText],["▤",c.datasheets,c.datasheetsText],["⚗",c.notes,c.notesText],["▣",c.guides,c.guidesText]].map(([icon,title,text]) => <Link href={href(locale, "/resources")} className="resource-card" key={title}><span className="resource-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small><em>{c.requestFile}</em></span></Link>)}</div></div></section>

    <section className="contact-strip" id="inquiry"><div className="container contact-grid"><div className="contact-intro"><h2>{c.contactTitle}</h2><p>{c.contactText}</p><a href={whatsappUrl} target="_blank" rel="noopener noreferrer">✆ &nbsp;{c.phoneLabel} ↗</a></div><InquiryForm locale={locale} /></div></section>
  </>;
}
