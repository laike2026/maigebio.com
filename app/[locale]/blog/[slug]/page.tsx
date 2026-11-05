import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { interiorCopy } from "@/lib/interior-copy";
import { href, isLocale } from "@/lib/site";
import { applyContentSeo, pageMetadata } from "@/lib/seo";
import { publishedArticle, publishedArticleRelations, redirectTarget } from "@/lib/public-content";
import { art, InteriorHero, SupportCTA } from "@/components/interiors/Interior";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const item = await publishedArticle(locale, slug);
  if (!item) return {};
  return applyContentSeo(
    pageMetadata(
      locale,
      String(item.seo?.title || item.title),
      String(item.seo?.description || item.excerpt),
      `/blog/${slug}`,
    ),
    item.seo || {},
  );
}
export default async function Article({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const c = interiorCopy(locale);
  const item = await publishedArticle(locale, slug);
  if (!item) {
    const target = await redirectTarget(`/${locale}/blog/${slug}`);
    if (target) permanentRedirect(target);
    notFound();
  }
  const relations = await publishedArticleRelations(item.id);
  const headings: { id: string; text: string }[] = [];
  const html = item.body_html.replace(
    /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_all, level: string, attrs: string, body: string) => {
      const id = `mi-heading-${headings.length}`;
      headings.push({
        id,
        text: body
          .replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&nbsp;/g, " "),
      });
      return `<h${level}${attrs.replace(/\s+id=("[^"]*"|'[^']*')/gi, "")} id="${id}">${body}</h${level}>`;
    },
  );
  return (
    <div className="mi-page">
      <InteriorHero
        locale={locale}
        title={item.title}
        intro={item.excerpt}
        image={null}
        crumbs={[{ label: c.blogTitle, path: "/blog" }, { label: item.title }]}
      />
      <div className="container mi-content">
        {
          <Image
            className="mi-article-cover"
            src={item.image_url || art("lab-hero")}
            alt=""
            width={1280}
            height={600}
            priority
          />
        }
        <div className="mi-article-layout">
          <aside className="mi-article-toc">
            <h3>{c.reading}</h3>
            {headings.map((h) => (
              <a href={"#" + h.id} key={h.id}>
                {h.text}
              </a>
            ))}
            <Link href={href(locale, "/blog")}>{c.blogTitle}</Link>
          </aside>
          <article className="mi-richtext" dangerouslySetInnerHTML={{ __html: html }} />
          <aside className="mi-article-related">
            <h2>{c.relatedProducts}</h2>
            {relations.products.length ? (
              relations.products.map((x) => (
                <Link key={x.slug} href={href(locale, `/products/${x.slug}`)}>
                  {x.title}
                </Link>
              ))
            ) : (
              <Link href={href(locale, "/products")}>{c.viewProducts}</Link>
            )}
            <Link href={href(locale, "/contact")}>{c.askTechnical}</Link>
          </aside>
        </div>
        {relations.articles.length > 0 && (
          <section className="mi-section mi-content">
            <h2>{c.readMore}</h2>
            <div className="mi-plain-links">
              {relations.articles.map((x) => (
                <Link className="mi-text-link" href={href(locale, `/blog/${x.slug}`)} key={x.slug}>
                  {x.title}
                </Link>
              ))}
            </div>
          </section>
        )}
        <SupportCTA locale={locale} />
      </div>
    </div>
  );
}
