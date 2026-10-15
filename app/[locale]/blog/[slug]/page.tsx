import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getCopy } from "@/lib/i18n";
import { articles, href, isLocale, type Locale } from "@/lib/site";
import { applyContentSeo, pageMetadata } from "@/lib/seo";
import { publishedArticle, publishedArticleRelations, redirectTarget } from "@/lib/public-content";

export async function generateStaticParams() { return ["en", "ar", "ru", "es"].flatMap((locale) => articles.map((item) => ({ locale, slug: item.slug }))); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params; if (!isLocale(locale)) return {};
  const article = await publishedArticle(locale, slug);
  if (!article) { const item = articles.find((entry) => entry.slug === slug); const c = getCopy(locale); return item ? pageMetadata(locale, c[item.key], c[`${item.key}Text`], `/blog/${slug}`) : {}; }
  const seo = article.seo || {}; const meta = pageMetadata(locale, String(seo.title || article.title), String(seo.description || article.excerpt), `/blog/${slug}`);
  return applyContentSeo(meta, seo);
}

export default async function Article({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params; if (!isLocale(raw)) notFound(); const locale: Locale = raw; const c = getCopy(locale);
  const managedArticle = await publishedArticle(locale, slug);
  const staticItem = articles.find((entry) => entry.slug === slug);
  if (staticItem && !managedArticle) {
    const isDialysis = slug === "choosing-dialysis-tubing";
    return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.blogTitle, path: "/blog" }, { label: c[staticItem.key] }]} /><p className="eyebrow">MAIGE / RESEARCH GUIDE</p><h1>{c[staticItem.key]}</h1><p>{c[`${staticItem.key}Text`]}</p></div></div><div className="container interior-content"><article className="article-body"><p className="article-intro">{c[`${staticItem.key}Text`]}</p><h2>{c.productQuestions}</h2><p>{c.productQuestionText}</p><ul className="bullet-list">{(isDialysis ? ["Membrane material", "MWCO", "Width or diameter", "Sample and buffer compatibility", "Required documentation"] : ["Target analyte", "Species reactivity", "Sample type", "Assay format", "Protocol and storage"]).map((field) => <li key={field}>{field}</li>)}</ul><h2>{c.specification}</h2><p>{c.specificationText}</p><div className="article-cta"><h2>{c.askTechnical}</h2><p>{c.contentPending}</p><Link className="button button-blue" href={href(locale, isDialysis ? "/products/dialysis-tubing" : "/products/elisa-kits")}>{c.viewProducts}</Link><Link className="button button-outline" href={href(locale, "/contact")}>{c.quote}</Link></div></article></div></div>;
  }
  const article = managedArticle;
  if (article) { const related = await publishedArticleRelations(article.id); return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.blogTitle, path: "/blog" }, { label: article.title }]} /><p className="eyebrow">MAIGE / INSIGHTS</p><h1>{article.title}</h1><p>{article.excerpt}</p></div></div><div className="container interior-content"><article className="article-body"><div dangerouslySetInnerHTML={{ __html: article.body_html }} />{related.products.length > 0 && <section className="related-content"><h2>{c.related}</h2><div className="related-media">{related.products.map((item) => <Link href={href(locale, `/products/${item.slug}`)} key={item.slug}>{item.title} →</Link>)}</div></section>}{related.articles.length > 0 && <section className="related-content"><h2>{c.readMore}</h2><div className="related-media">{related.articles.map((item) => <Link href={href(locale, `/blog/${item.slug}`)} key={item.slug}>{item.title} →</Link>)}</div></section>}<div className="article-cta"><h2>{c.askTechnical}</h2><Link className="button button-blue" href={href(locale, "/contact")}>{c.quote}</Link></div></article></div></div>; }
  const target = await redirectTarget(`/${locale}/blog/${slug}`); if (target) permanentRedirect(target);
  notFound();
}
