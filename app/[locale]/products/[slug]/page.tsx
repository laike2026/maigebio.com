import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import InquiryForm from "@/components/InquiryForm";
import { getCopy } from "@/lib/i18n";
import { categories, href, isLocale, type Locale } from "@/lib/site";
import { applyContentSeo, pageMetadata } from "@/lib/seo";
import { publishedCategory, publishedProduct, publishedProductRelations, publishedProducts, redirectTarget } from "@/lib/public-content";

export async function generateStaticParams() { return ["en", "ar", "ru", "es"].flatMap((locale) => categories.map((item) => ({ locale, slug: item.slug }))); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params; if (!isLocale(locale)) return {};
  const c = getCopy(locale); const staticItem = categories.find((entry) => entry.slug === slug);
  const dbItem = await publishedProduct(locale, slug) || await publishedCategory(slug);
  if (!dbItem) return staticItem ? pageMetadata(locale, c[staticItem.key], c[`${staticItem.key}Text`], `/products/${slug}`) : {};
  const seo = dbItem.seo || {};
  const meta = pageMetadata(locale, String(seo.title || dbItem.name), String(seo.description || dbItem.summary), `/products/${slug}`);
  return applyContentSeo(meta, seo);
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params; if (!isLocale(raw)) notFound();
  const locale: Locale = raw; const c = getCopy(locale);
  const staticItem = categories.find((entry) => entry.slug === slug);
  const managedCategory = await publishedCategory(slug);
  if (staticItem && !managedCategory) {
    const fields = slug === "dialysis-tubing" ? ["Membrane material", "MWCO", "Flat width / diameter", "Length", "Storage and handling"] : ["Target / analyte", "Species reactivity", "Sample type", "Assay format", "Protocol and storage"];
    const title = c[staticItem.key];
    return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.productCenter, path: "/products" }, { label: title }]} /><p className="eyebrow">MAIGE / PRODUCTS</p><h1>{title}</h1><p>{c[`${staticItem.key}Text`]}</p></div></div><div className="container interior-content"><div className="product-detail-grid"><div className="product-detail-image"><Image src={staticItem.image} width={760} height={570} alt={`${title} illustrative visual`} priority /></div><div className="product-detail-copy"><p className="card-kicker">{c.contentPending}</p><h2>{c.specification}</h2><p>{c.specificationText}</p><ul className="spec-list">{fields.map((field) => <li key={field}><span>{field}</span></li>)}</ul><div className="detail-actions"><a className="button button-blue" href="#product-inquiry">{c.quote}</a><Link className="button button-outline" href={href(locale, "/resources")}>{c.requestInformation}</Link></div></div></div><div className="info-panels"><article><h2>{c.productQuestions}</h2><p>{c.productQuestionText}</p></article><article><h2>{c.related}</h2><Link href={href(locale, "/applications")}>{c.applications} →</Link><Link href={href(locale, "/blog")}>{c.blogTitle} →</Link></article></div><div className="detail-inquiry" id="product-inquiry"><div><h2>{c.askTechnical}</h2><p>{c.contactText}</p></div><InquiryForm locale={locale} initialProduct={slug === "dialysis-tubing" ? "Dialysis Tubing" : "ELISA Kits"} /></div></div></div>;
  }
  const item = await publishedProduct(locale, slug);
  if (item) {
    const specs = Array.isArray(item.specifications) ? item.specifications : [];
    const relations = await publishedProductRelations(item.id);
    return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.productCenter, path: "/products" }, { label: item.name }]} /><p className="eyebrow">MAIGE / {item.sku}</p><h1>{item.name}</h1><p>{item.summary}</p></div></div><div className="container interior-content"><div className="product-detail-grid"><div className="product-detail-image">{item.image_url && <Image src={item.image_url} width={760} height={570} alt={item.name} priority />}</div><div className="product-detail-copy"><p className="card-kicker">{item.sku}</p><h2>{c.specification}</h2><ul className="spec-list">{specs.map((spec, index) => <li key={index}><span>{typeof spec === "string" ? spec : spec && typeof spec === "object" ? [String((spec as Record<string, unknown>).name || ""), String((spec as Record<string, unknown>).value || "")].filter(Boolean).join(": ") : ""}</span></li>)}</ul><div className="detail-actions"><a className="button button-blue" href="#product-inquiry">{c.quote}</a><Link className="button button-outline" href={href(locale, "/resources")}>{c.requestInformation}</Link></div></div></div><article className="article-body" dangerouslySetInnerHTML={{ __html: item.description_html }} />{relations.media.length > 0 && <section className="related-content"><h2>{c.resources}</h2><div className="related-media">{relations.media.map((asset) => asset.kind === "image" ? <a href={asset.url} key={asset.id} target="_blank" rel="noopener noreferrer"><Image src={asset.url} width={260} height={180} alt={asset.alt_text || asset.name} /></a> : <a href={asset.url} key={asset.id} target="_blank" rel="noopener noreferrer">▤ {asset.name} ↗</a>)}</div></section>}{relations.related.length > 0 && <section className="related-content"><h2>{c.related}</h2><div className="related-media">{relations.related.map((product) => <Link href={href(locale, `/products/${product.slug}`)} key={product.slug}>{product.image_url && <Image src={product.image_url} width={220} height={150} alt="" />}<strong>{product.name}</strong></Link>)}</div></section>}<div className="detail-inquiry" id="product-inquiry"><div><h2>{c.askTechnical}</h2><p>{c.contactText}</p></div><InquiryForm locale={locale} initialProduct="Other" productName={`${item.name} (${item.sku})`} /></div></div></div>;
  }
  const category = managedCategory;
  if (category) {
    const related = await publishedProducts(locale, { category: slug, size: 100 });
    return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.productCenter, path: "/products" }, { label: category.name }]} /><p className="eyebrow">MAIGE / CATEGORY</p><h1>{category.name}</h1><p>{category.summary}</p></div></div><div className="container interior-content"><article className="article-body" dangerouslySetInnerHTML={{ __html: category.description_html }} /><div className="catalog-grid">{related.map((product) => <article className="catalog-card" key={product.id}><Link href={href(locale, `/products/${product.slug}`)}>{product.image_url && <Image src={product.image_url} width={600} height={400} alt={product.name} />}<div><h2>{product.name}</h2><p>{product.summary}</p><span className="text-link">{c.viewDetails} →</span></div></Link></article>)}</div></div></div>;
  }
  const target = await redirectTarget(`/${locale}/products/${slug}`); if (target) permanentRedirect(target);
  notFound();
}
