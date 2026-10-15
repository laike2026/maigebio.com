import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getCopy } from "@/lib/i18n";
import { categories, href, isLocale, type Locale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { publishedCategories, publishedProducts } from "@/lib/public-content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; if (!isLocale(locale)) return {};
  const c = getCopy(locale); return pageMetadata(locale, c.productCenter, c.productIntro, "/products");
}

export default async function Products({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; category?: string }> }) {
  const { locale: raw } = await params; if (!isLocale(raw)) notFound();
  const locale: Locale = raw; const c = getCopy(locale);
  const { q = "", category = "" } = await searchParams; const search = q.trim().toLocaleLowerCase();
  const [dbCategories, dbProducts] = await Promise.all([publishedCategories(), publishedProducts(locale, { q, category, size: 100 })]);
  const existing = categories.filter((item) => !dbCategories.some((managed) => managed.slug === item.slug) && (!category || category === item.slug) && (!search || `${c[item.key]} ${c[`${item.key}Text`]} ${item.slug}`.toLocaleLowerCase().includes(search)));
  const addedCategories = dbCategories.filter((item) => (!category || item.slug === category) && (!search || `${item.name} ${item.summary}`.toLowerCase().includes(search)));
  const hasResults = Boolean(existing.length || addedCategories.length || dbProducts.length);
  return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.productCenter }]} /><p className="eyebrow">MAIGE / PRODUCTS</p><h1>{c.productCenter}</h1><p>{c.productIntro}</p></div></div>
    <div className="container interior-content"><form className="product-filter" action={href(locale, "/products")}><input type="search" name="q" defaultValue={q} placeholder={c.searchPlaceholder} aria-label={c.search} /><select name="category" defaultValue={category} aria-label={c.allProducts}><option value="">{c.allProducts}</option>{categories.filter((item) => !dbCategories.some((managed) => managed.slug === item.slug)).map((item) => <option key={item.slug} value={item.slug}>{c[item.key]}</option>)}{dbCategories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select><button className="button button-blue" type="submit">{c.searchProducts}</button>{(q || category) && <Link href={href(locale, "/products")}>{c.clearSearch}</Link>}</form>
    {search && <h2 className="results-heading">{c.searchResults}: “{q}”</h2>}
    {hasResults ? <div className="catalog-grid">
      {existing.map((item) => <article key={item.slug} className="catalog-card"><Link href={href(locale, `/products/${item.slug}`)}><Image src={item.image} width={600} height={400} alt="" /><div><p className="card-kicker">MAIGE / RESEARCH</p><h2>{c[item.key]}</h2><p>{c[`${item.key}Text`]}</p><span className="text-link">{c.viewDetails} →</span></div></Link></article>)}
      {addedCategories.map((item) => <article key={item.id} className="catalog-card"><Link href={href(locale, `/products/${item.slug}`)}>{item.image_url ? <Image src={item.image_url} width={600} height={400} alt={item.name} /> : <div className="editorial-art" aria-hidden="true" />}<div><p className="card-kicker">MAIGE / CATEGORY</p><h2>{item.name}</h2><p>{item.summary}</p><span className="text-link">{c.viewDetails} →</span></div></Link></article>)}
      {dbProducts.map((item) => <article key={item.id} className="catalog-card"><Link href={href(locale, `/products/${item.slug}`)}>{item.image_url ? <Image src={item.image_url} width={600} height={400} alt={item.name} /> : <div className="editorial-art" aria-hidden="true" />}<div><p className="card-kicker">MAIGE / {item.sku}</p><h2>{item.name}</h2><p>{item.summary}</p><span className="text-link">{c.viewDetails} →</span></div></Link></article>)}
    </div> : <div className="empty-state"><h2>{c.noResults}</h2><Link className="button button-blue" href={href(locale, "/contact")}>{c.askTechnical}</Link></div>}</div></div>;
}
