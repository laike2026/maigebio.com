import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { interiorCopy } from "@/lib/interior-copy";
import { categories, href, isLocale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { publishedArticles } from "@/lib/public-content";
import {
  art,
  InteriorHero,
  ProductCard,
  productArt,
  ScienceIcon,
  SupportCTA,
} from "@/components/interiors/Interior";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = interiorCopy(locale);
  return pageMetadata(locale, c.blogTitle, c.blogIntro, "/blog");
}
export default async function Blog({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = interiorCopy(locale);
  const { q = "" } = await searchParams;
  const articles = await publishedArticles(locale, { q, size: 100 });
  const [featured, ...rest] = articles;
  return (
    <div className="mi-page">
      <InteriorHero locale={locale} title={c.insights} intro={c.blogIntro} />
      <div className="container mi-content">
        <form className="mi-search" action={href(locale, "/blog")}>
          <input name="q" type="search" defaultValue={q} placeholder={c.search} aria-label={c.search} />
          <button className="button button-blue">{c.search}</button>
          {q && (
            <Link className="button button-outline" href={href(locale, "/blog")}>
              {c.clearSearch}
            </Link>
          )}
        </form>
        {featured ? (
          <>
            <article className="mi-blog-feature">
              <Link href={href(locale, `/blog/${featured.slug}`)} tabIndex={-1} aria-hidden="true">
                <Image
                  src={featured.image_url || art("dialysis-product")}
                  alt=""
                  width={900}
                  height={560}
                  priority
                />
              </Link>
              <div>
                <p className="mi-kicker">{c.blogTitle}</p>
                <h2>
                  <Link href={href(locale, `/blog/${featured.slug}`)}>{featured.title}</Link>
                </h2>
                <p>{featured.excerpt}</p>
                <Link className="mi-text-link" href={href(locale, `/blog/${featured.slug}`)}>
                  {c.readMore}
                  <ScienceIcon name="arrow" size={20} />
                </Link>
              </div>
            </article>
            <div className="mi-blog-grid">
              {rest.map((item, i) => (
                <article key={item.id} className="mi-blog-card">
                  <Link href={href(locale, `/blog/${item.slug}`)}>
                    <Image
                      src={item.image_url || art(["lab-hero", "elisa-product", "molecular-hero"][i % 3])}
                      alt=""
                      width={600}
                      height={375}
                    />
                    <h2>{item.title}</h2>
                  </Link>
                  <p>{item.excerpt}</p>
                  <Link className="mi-text-link" href={href(locale, `/blog/${item.slug}`)}>
                    {c.readMore}
                    <ScienceIcon name="arrow" size={18} />
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mi-empty mi-section">
              <ScienceIcon name="book" size={48} />
              <h2>{q ? c.noResults : c.noArticles}</h2>
              <p>{c.articleEmpty}</p>
            </div>
            <div className="mi-blog-grid">
              {categories.map((item) => (
                <ProductCard
                  key={item.slug}
                  locale={locale}
                  title={c[item.key]}
                  summary={c[item.key + "Text"]}
                  image={art(productArt[item.slug])}
                  path={`/products/${item.slug}`}
                />
              ))}
            </div>
          </>
        )}
        <SupportCTA locale={locale} />
      </div>
    </div>
  );
}
