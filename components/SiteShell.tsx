import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import AnalyticsConsent from "./AnalyticsConsent";
import { getCopy } from "@/lib/i18n";
import { href, whatsappUrl, type Locale } from "@/lib/site";

function Logo({ locale, light = false }: { locale: Locale; light?: boolean }) {
  return <Link className={`brand${light ? " brand-light" : ""}`} href={href(locale)} aria-label="MAIGE home">
    <span className="brand-image"><Image src="/images/brand/maige-logo.jpg" width={60} height={60} alt="MAIGE 麦格生物 logo" priority /></span>
    <span className="brand-word"><strong>MAIGE</strong><small>麦格生物</small></span>
  </Link>;
}

function NavLinks({ locale }: { locale: Locale }) {
  const c = getCopy(locale);
  return <>
    <details className="nav-drop"><summary>{c.navProducts}<span>⌄</span></summary><div className="nav-menu"><Link href={href(locale, "/products")}>{c.productCenter}</Link><Link href={href(locale, "/products/dialysis-tubing")}>{c.dialysis}</Link><Link href={href(locale, "/products/elisa-kits")}>{c.elisa}</Link></div></details>
    <details className="nav-drop"><summary>{c.navApplications}<span>⌄</span></summary><div className="nav-menu"><Link href={href(locale, "/applications")}>{c.applications}</Link><Link href={href(locale, "/applications/protein-research")}>{c.protein}</Link><Link href={href(locale, "/applications/immunology")}>{c.immunology}</Link></div></details>
    <details className="nav-drop"><summary>{c.navResources}<span>⌄</span></summary><div className="nav-menu"><Link href={href(locale, "/resources")}>{c.resourcesTitle}</Link><Link href={href(locale, "/blog")}>{c.blogTitle}</Link><Link href={href(locale, "/faq")}>{c.faqTitle}</Link></div></details>
    <details className="nav-drop"><summary>{c.navAbout}<span>⌄</span></summary><div className="nav-menu"><Link href={href(locale, "/about")}>{c.aboutTitle}</Link><Link href={href(locale, "/manufacturing-quality")}>{c.qualityTitle}</Link></div></details>
    <Link href={href(locale, "/oem-odm")}>{c.navOem}</Link>
    <Link href={href(locale, "/contact")}>{c.navContact}</Link>
  </>;
}

export default function SiteShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const c = getCopy(locale);
  return <>
    <div className="topbar"><div className="container topbar-inner"><span>{c.trusted}</span><div className="topbar-actions"><a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">✆</span> {c.phoneLabel}</a><LanguageSwitcher locale={locale} /></div></div></div>
    <header className="site-header"><div className="container header-inner"><Logo locale={locale} /><nav className="desktop-nav" aria-label="Main navigation"><NavLinks locale={locale} /></nav><div className="header-actions"><Link className="header-search" href={href(locale, "/products")} aria-label={c.search}>⌕</Link><Link className="button button-green" href={href(locale, "/contact")}>{c.quote}</Link></div><details className="mobile-menu"><summary aria-label={c.menu}>☰</summary><nav aria-label="Mobile navigation"><NavLinks locale={locale} /><LanguageSwitcher locale={locale} /><Link className="button button-green" href={href(locale, "/contact")}>{c.quote}</Link></nav></details></div></header>
    <main>{children}</main>
    <footer className="site-footer"><div className="container footer-grid"><div className="footer-brand"><Logo locale={locale} light /><p>{c.footerLine}</p></div><div><h3>{c.footerProducts}</h3><Link href={href(locale, "/products/dialysis-tubing")}>{c.dialysis}</Link><Link href={href(locale, "/products/elisa-kits")}>{c.elisa}</Link><Link href={href(locale, "/oem-odm")}>{c.solutions}</Link></div><div><h3>{c.footerResources}</h3><Link href={href(locale, "/resources")}>{c.resources}</Link><Link href={href(locale, "/blog")}>{c.blogTitle}</Link><Link href={href(locale, "/faq")}>{c.faqTitle}</Link></div><div><h3>{c.footerAbout}</h3><Link href={href(locale, "/about")}>{c.aboutTitle}</Link><Link href={href(locale, "/manufacturing-quality")}>{c.qualityTitle}</Link><Link href={href(locale, "/contact")}>{c.navContact}</Link></div><div className="footer-contact"><h3>{c.footerUpdates}</h3><p>{c.footerUpdatesText}</p><a className="footer-whatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer">◉ {c.whatsapp} ↗</a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} {c.footerRights}</span><div><Link href={href(locale, "/privacy-policy")}>{c.privacyTitle}</Link><Link href={href(locale, "/terms")}>{c.termsTitle}</Link></div></div></footer>
    <a className="whatsapp-float" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={c.phoneLabel}><span className="wa-icon" aria-hidden="true">✆</span><span>{c.whatsapp}</span></a>
    <AnalyticsConsent locale={locale} measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
  </>;
}
