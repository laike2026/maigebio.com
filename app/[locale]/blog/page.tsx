import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { getCopy } from "@/lib/i18n";
import { href, isLocale, type Locale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { publishedArticles } from "@/lib/public-content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const c = getCopy(locale); return pageMetadata(locale, c.blogTitle, c.blogIntro, "/blog"); }

export default async function Blog({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; if (!isLocale(raw)) notFound(); const locale: Locale = raw; const c = getCopy(locale);
  const dbArticles = await publishedArticles(locale, { size: 100 });
  return <div className="interior-page"><div className="interior-banner"><div className="container"><Breadcrumb locale={locale} items={[{ label: c.blogTitle }]} /><p className="eyebrow">MAIGE / INSIGHTS</p><h1>{c.blogTitle}</h1><p>{c.blogIntro}</p></div></div><div className="container interior-content"><div className="blog-grid">
    {dbArticles.length === 0 && <div className="empty-state"><h2>{c.contentPending}</h2></div>}
    {dbArticles.map((article) => <article className="blog-card" key={article.id}>{article.image_url ? <Image src={article.image_url} alt={article.title} width={360} height={260} /> : <div className="blog-art" aria-hidden="true"><span>✦</span></div>}<div><p className="card-kicker">MAIGE / INSIGHTS</p><h2>{article.title}</h2><p>{article.excerpt}</p><Link className="text-link" href={href(locale, `/blog/${article.slug}`)}>{c.readMore} →</Link></div></article>)}
  </div></div></div>;
}
