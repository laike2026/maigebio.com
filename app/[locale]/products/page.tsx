import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categories, href, isLocale } from "@/lib/site";
import { interiorCopy } from "@/lib/interior-copy";
import { pageMetadata } from "@/lib/seo";
import { publishedCategories, publishedProducts } from "@/lib/public-content";
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
  return pageMetadata(locale, c.productCenter, c.productIntro, "/products");
}
export default async function Products({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = interiorCopy(locale);
  const { q = "", category = "" } = await searchParams;
  const search = q.trim().toLowerCase();
  const [dbCategories, products] = await Promise.all([
    publishedCategories(),
    publishedProducts(locale, { q, category, size: 100 }),
  ]);
  const families = categories.map((item) => ({
    slug: item.slug,
    name: c[item.key],
    summary: c[item.key + "Text"],
    image: art(productArt[item.slug]),
  }));
  const allCategories = [
    ...families,
    ...dbCategories
      .filter((x) => !families.some((f) => f.slug === x.slug))
      .map((x) => ({ ...x, image: x.image_url || art("molecule-hero") })),
  ];
  const shown = allCategories.filter(
    (x) =>
      (!category || x.slug === category) &&
      (!search || `${x.name} ${x.summary} ${x.slug}`.toLowerCase().includes(search)),
  );
  return (
    <div className="mi-page">
      <InteriorHero
        locale={locale}
        title={c.productHeading}
        intro={c.productIntro}
        crumbs={[{ label: c.productCenter }]}
        image="molecule-hero"
      />
      <div className="container mi-content">
        <form className="mi-search" action={href(locale, "/products")}>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={c.searchPlaceholder}
            aria-label={c.search}
          />
          <select name="category" defaultValue={category} aria-label={c.browseCategories}>
            <option value="">{c.allProducts}</option>
            {allCategories.map((x) => (
              <option value={x.slug} key={x.slug}>
                {x.name}
              </option>
            ))}
          </select>
          <button className="button button-blue">{c.searchProducts}</button>
        </form>
        <div className="mi-family-links">
          {families.map((x, i) => (
            <Link href={href(locale, `/products/${x.slug}`)} key={x.slug}>
              <ScienceIcon name={(["layers", "flask", "filter"] as const)[i]} size={36} />
              {x.name}
              <ScienceIcon name="arrow" size={19} />
            </Link>
          ))}
        </div>
        <div className="mi-catalog-layout">
          <aside className="mi-sidebar">
            <h2>{c.browseCategories}</h2>
            <Link href={href(locale, "/products")} aria-current={!category ? "page" : undefined}>
              {c.allProducts}
            </Link>
            {allCategories.map((x) => (
              <Link
                href={href(locale, "/products") + `?category=${encodeURIComponent(x.slug)}`}
                aria-current={category === x.slug ? "page" : undefined}
                key={x.slug}
              >
                {x.name}
              </Link>
            ))}
          </aside>
          <section className="mi-catalog-results">
            <h2>{search ? `${c.searchResults}: “${q}”` : c.browseProducts}</h2>
            {(search || category) && (
              <p>
                <Link className="mi-text-link" href={href(locale, "/products")}>
                  {c.clearSearch}
                </Link>
              </p>
            )}
            {shown.map((x) => (
              <ProductCard
                locale={locale}
                title={x.name}
                summary={x.summary}
                image={x.image}
                path={`/products/${x.slug}`}
                key={x.slug}
                row
              />
            ))}
            {products.map((x) => (
              <ProductCard
                locale={locale}
                title={x.name}
                summary={x.summary}
                image={x.image_url || art(productArt[x.category_slug || ""] || "lab-hero")}
                path={`/products/${x.slug}`}
                sku={x.sku}
                key={x.id}
                row
              />
            ))}
            {!shown.length && !products.length && (
              <div className="mi-empty">
                <ScienceIcon name="microscope" size={45} />
                <h2>{c.noResults}</h2>
                <Link className="button button-green" href={href(locale, "/contact")}>
                  {c.askTechnical}
                </Link>
              </div>
            )}
          </section>
        </div>
        <SupportCTA locale={locale} />
      </div>
    </div>
  );
}
