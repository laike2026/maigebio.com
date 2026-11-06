import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { interiorCopy } from "@/lib/interior-copy";
import { href, isLocale } from "@/lib/site";
import { applyContentSeo, pageMetadata } from "@/lib/seo";
import { publishedIndex, publishedPaths } from "@/lib/content-index";
import { publishedArticle, publishedArticleRelations, redirectTarget } from "@/lib/public-content";
import { art, InteriorHero, SupportCTA } from "@/components/interiors/Interior";
import StructuredData, { absoluteSiteUrl } from "@/components/StructuredData";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const item = await publishedArticle(locale, slug);
  if (!item) return {};
  if (item.slug !== slug) permanentRedirect(href(locale, `/blog/${item.slug}`));
  const [entry] = await publishedIndex("blog", item.id);
  return applyContentSeo(
    await pageMetadata(
      locale,
      String(item.seo?.title || item.title),
      String(item.seo?.description || item.excerpt),
      `/blog/${item.slug}`,
      { paths: entry ? publishedPaths("blog", entry) : {}, index: item.content_locale === locale },
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
  if (item.slug !== slug) permanentRedirect(href(locale, `/blog/${item.slug}`));
  const articlePath = `/blog/${item.slug}`;
  const canonical = absoluteSiteUrl(href(locale, articlePath));
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
    <div className="mi-page" data-content-base={`/blog/${item.base_slug}`}>
      <StructuredData data={{
        "@type": "Article",
        "@id": `${canonical}#article`,
        headline: item.title,
        description: item.excerpt,
        mainEntityOfPage: canonical,
        inLanguage: item.content_locale,
        datePublished: item.published_at ? new Date(item.published_at).toISOString() : undefined,
        dateModified: locale === "en" ? new Date(item.updated_at).toISOString() : undefined,
        image: item.image_url ? absoluteSiteUrl(item.image_url) : undefined,
        author: item.author ? { "@type": "Person", name: item.author } : undefined,
        publisher: { "@type": "Organization", name: "MAIGE Bioscience", "@id": absoluteSiteUrl("/#organization") },
      }} />
      <InteriorHero
        locale={locale}
        title={item.title}
        intro={item.excerpt}
        image={null}
        currentPath={articlePath}
        contentLanguage={item.content_locale}
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
          <article className="mi-richtext" lang={item.content_locale} dangerouslySetInnerHTML={{ __html: html }} />
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
