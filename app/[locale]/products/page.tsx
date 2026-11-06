import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { applications, categories, href, isLocale } from "@/lib/site";
import { interiorCopy } from "@/lib/interior-copy";
import { matchesSearch, searchValue, type SearchParams } from "@/lib/search";
import { applicationSummary } from "@/lib/procurement";
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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = interiorCopy(locale);
  const filters = await searchParams;
  return pageMetadata(locale, c.productCenter, c.productIntro, "/products", {
    index: !searchValue(filters, "q") && !searchValue(filters, "category", 120),
  });
}
export default async function Products({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = interiorCopy(locale);
  const paramsForSearch = await searchParams;
  const q = searchValue(paramsForSearch, "q");
  const category = searchValue(paramsForSearch, "category", 120);
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
      matchesSearch(q, x.name, x.summary, x.slug),
  );
  const matchingApplications = q && !category
    ? applications.filter((item) => matchesSearch(q, c[item.key], item.slug, applicationSummary(locale, item.slug)))
    : [];
  const catalogPath = href(locale, "/products");
  function categoryLink(slug: string) {
    const filter = new URLSearchParams();
    if (q) filter.set("q", q);
    if (slug) filter.set("category", slug);
    return catalogPath + (filter.size ? `?${filter}` : "");
  }
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
            <Link href={categoryLink("")} aria-current={!category ? "page" : undefined}>
              {c.allProducts}
            </Link>
            {allCategories.map((x) => (
              <Link
                href={categoryLink(x.slug)}
                aria-current={category === x.slug ? "page" : undefined}
                key={x.slug}
              >
                {x.name}
              </Link>
            ))}
          </aside>
          <section className="mi-catalog-results">
            <h2>{q ? `${c.searchResults}: “${q}”` : c.browseProducts}</h2>
            {(q || category) && (
              <p>
                <Link className="mi-text-link" href={href(locale, "/products")}>
                  {c.clearSearch}
                </Link>
              </p>
            )}
            {q && shown.length > 0 && <h3 className="mi-results-heading">{c.browseCategories}</h3>}
            {shown.map((x) => (
              <ProductCard
                locale={locale}
                title={x.name}
                summary={x.summary}
                image={x.image}
                path={`/products/${x.slug}`}
                key={x.slug}
                row
                heading={q ? "h4" : "h3"}
              />
            ))}
            {q && products.length > 0 && <h3 className="mi-results-heading">{c.browseProducts}</h3>}
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
                heading={q ? "h4" : "h3"}
              />
            ))}
            {matchingApplications.length > 0 && (
              <div className="mi-search-applications">
                <h3 className="mi-results-heading">{c.applications}</h3>
                <ul>
                  {matchingApplications.map((item) => (
                    <li key={item.slug}>
                      <Link className="mi-text-link" href={href(locale, `/applications/${item.slug}`)}>
                        {c[item.key]} <ScienceIcon name="arrow" size={18} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!shown.length && !products.length && !matchingApplications.length && (
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
