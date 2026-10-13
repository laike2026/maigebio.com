import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getCopy } from "@/lib/i18n";
import { categories, href, isLocale, type Locale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) return {};
  const c = getCopy(locale); return pageMetadata(locale, c.productCenter, c.productIntro, "/products");
}

export default async function Products({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; category?: string }> }) {
  const { locale: raw } = await params; if (!isLocale(raw)) notFound(); const locale: Locale = raw; const c = getCopy(locale);
  const { q = "", category = "" } = await searchParams; const query = q.trim().toLocaleLowerCase();
  const matches = categories.filter((item) => (!category || category === item.slug) && (!query || `${c[item.key]} ${c[`${item.key}Text`]} ${item.slug}`.toLocaleLowerCase().includes(query)));
  return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.productCenter }]} /><p className="eyebrow">MAIGE / PRODUCTS</p><h1>{c.productCenter}</h1><p>{c.productIntro}</p></div></div><div className="container interior-content"><form className="product-filter" action={href(locale, "/products")}><input type="search" name="q" defaultValue={q} placeholder={c.searchPlaceholder} aria-label={c.search} /><select name="category" defaultValue={category} aria-label={c.allProducts}><option value="">{c.allProducts}</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{c[item.key]}</option>)}</select><button className="button button-blue" type="submit">{c.searchProducts}</button>{(q || category) && <Link href={href(locale, "/products")}>{c.clearSearch}</Link>}</form>{query && <h2 className="results-heading">{c.searchResults}: “{q}”</h2>}{matches.length ? <div className="catalog-grid">{matches.map((item) => <article key={item.slug} className="catalog-card"><Link href={href(locale, `/products/${item.slug}`)}><Image src={item.image} width={600} height={400} alt="" /><div><p className="card-kicker">MAIGE / RESEARCH</p><h2>{c[item.key]}</h2><p>{c[`${item.key}Text`]}</p><span className="text-link">{c.viewDetails} →</span></div></Link></article>)}</div> : <div className="empty-state"><h2>{c.noResults}</h2><Link className="button button-blue" href={href(locale, "/contact")}>{c.askTechnical}</Link></div>}</div></div>;
}
