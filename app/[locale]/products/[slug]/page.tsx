import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import InquiryForm from "@/components/InquiryForm";
import ProductGallery from "@/components/interiors/ProductGallery";
import ProductSpecPicker from "@/components/interiors/ProductSpecPicker";
import {
  art,
  InteriorHero,
  ProductCard,
  productArt,
  ResourceRows,
  SpecTable,
  SupportCTA,
  Workflow,
} from "@/components/interiors/Interior";
import { interiorCopy } from "@/lib/interior-copy";
import { categories, href, isLocale } from "@/lib/site";
import { applyContentSeo, pageMetadata } from "@/lib/seo";
import {
  publishedCategory,
  publishedProduct,
  publishedProductRelations,
  publishedProducts,
  redirectTarget,
} from "@/lib/public-content";
export async function generateStaticParams() {
  return ["en", "ar", "ru", "es"].flatMap((locale) => categories.map((x) => ({ locale, slug: x.slug })));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const c = interiorCopy(locale);
  const fixed = categories.find((x) => x.slug === slug);
  const item = (await publishedProduct(locale, slug)) || (await publishedCategory(slug));
  if (!item)
    return fixed ? pageMetadata(locale, c[fixed.key], c[fixed.key + "Text"], `/products/${slug}`) : {};
  return applyContentSeo(
    pageMetadata(
      locale,
      String(item.seo?.title || item.name),
      String(item.seo?.description || item.summary),
      `/products/${slug}`,
    ),
    item.seo || {},
  );
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const c = interiorCopy(locale);
  const [item, category] = await Promise.all([publishedProduct(locale, slug), publishedCategory(slug)]);
  const fixed = categories.find((x) => x.slug === slug);
  if (category && !item) {
    const products = await publishedProducts(locale, { category: slug, size: 100 });
    return (
      <div className="mi-page">
        <InteriorHero
          locale={locale}
          title={category.name}
          intro={category.summary}
          image={productArt[slug] || "molecule-hero"}
          crumbs={[{ label: c.productCenter, path: "/products" }, { label: category.name }]}
        />
        <div className="container mi-content">
          <article
            className="mi-richtext mi-section"
            dangerouslySetInnerHTML={{ __html: category.description_html }}
          />
          <h2>{c.browseProducts}</h2>
          <div className="mi-table-scroll">
            <table className="mi-category-table">
              <thead>
                <tr>
                  <th>{c.product}</th>
                  <th>{c.specifications}</th>
                  <th>{c.productEnquiry}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link className="mi-category-product" href={href(locale, `/products/${x.slug}`)}>
                        <Image
                          src={x.image_url || art(productArt[slug] || "lab-hero")}
                          alt=""
                          width={140}
                          height={105}
                        />
                        <span>
                          <strong>{x.name}</strong>
                          <small>{x.sku}</small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      {x.summary}
                      <br />
                      <Link className="mi-text-link" href={href(locale, `/products/${x.slug}`)}>
                        {c.viewDetails}
                      </Link>
                    </td>
                    <td>
                      <Link
                        className="button button-green"
                        href={href(locale, `/products/${x.slug}`) + "#product-inquiry"}
                      >
                        {c.quote}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!products.length && <p>{c.specHelp}</p>}
          <SupportCTA locale={locale} />
        </div>
      </div>
    );
  }
  if (!item && !fixed) {
    const target = await redirectTarget(`/${locale}/products/${slug}`);
    if (target) permanentRedirect(target);
    notFound();
  }
  const family = item?.category_slug || slug;
  const title = item?.name || c[fixed!.key];
  const summary = item?.summary || c[fixed!.key + "Text"];
  const relations = item ? await publishedProductRelations(item.id) : { media: [], related: [] };
  const image = item?.image_url || art(productArt[family] || "lab-hero");
  const fields =
    family === "dialysis-tubing"
      ? ["MWCO", c.material, c.width, c.length]
      : family === "elisa-kits"
        ? [c.target, c.species, c.sample, c.format]
        : family === "lab-consumables"
          ? [c.pore, c.format, c.packaging, c.compatibility]
          : [c.specifications, c.sample, c.packaging];
  const rows: [string, string][] = item?.specifications?.length
    ? item.specifications.map((s, index) =>
        typeof s === "object" && s
          ? [
              String((s as Record<string, unknown>).name || index + 1),
              String((s as Record<string, unknown>).value || ""),
            ]
          : [String(s), ""],
      )
    : fields.map((f) => [f, c.confirmSpec]);
  const initialProduct =
    family === "dialysis-tubing"
      ? "Dialysis Tubing"
      : family === "elisa-kits"
        ? "ELISA Kits"
        : family === "lab-consumables"
          ? "Laboratory Consumables"
          : "Other";
  const steps =
    family === "dialysis-tubing"
      ? [
          { title: c.samplePrep, icon: "sample" as const },
          { title: c.bufferExchange, icon: "filter" as const },
          { title: c.analysis, icon: "microscope" as const },
        ]
      : family === "elisa-kits"
        ? [
            { title: c.samplePrep, icon: "sample" as const },
            { title: c.reagent, icon: "flask" as const },
            { title: c.incubation, icon: "review" as const },
            { title: c.analysis, icon: "microscope" as const },
          ]
        : [
            { title: c.samplePrep, icon: "sample" as const },
            { title: c.filtration, icon: "filter" as const },
            { title: c.collection, icon: "drop" as const },
          ];
  const detailArt =
    family === "dialysis-tubing"
      ? "dialysis-process"
      : family === "elisa-kits"
        ? "elisa-workflow"
        : family === "lab-consumables"
          ? "strainer-workflow"
          : "lab-hero";
  const original = categories.find((x) => x.slug === family)?.image;
  const gallery = [
    image,
    ...(original ? [original] : []),
    art(detailArt),
    ...relations.media.filter((x) => x.kind === "image").map((x) => x.url),
  ];
  return (
    <div className="mi-page">
      <div className="container mi-breadcrumb">
        <Breadcrumb
          locale={locale}
          items={[{ label: c.productCenter, path: "/products" }, { label: title }]}
        />
      </div>
      <div className="container mi-product-top">
        <ProductGallery
          key={slug}
          images={gallery}
          title={title}
          enlarge={c.viewImage}
          close={c.close}
          note={!item?.image_url ? c.imageNote : undefined}
        />
        <div className="mi-product-info">
          {item?.sku && <p className="mi-kicker">{item.sku}</p>}
          <h1>{title}</h1>
          <p>{summary}</p>
          <ProductSpecPicker
            title={title}
            fields={fields}
            heading={c.chooseSpecs}
            placeholder={c.requirements}
            quote={c.quote}
            information={c.requestInformation}
            resourceUrl={href(locale, "/resources")}
          />
        </div>
      </div>
      <nav className="mi-anchor-nav" aria-label={c.reading}>
        <div className="container">
          {["overview", "specifications", "workflow", "documents"].map((key) => (
            <a href={"#" + key} key={key}>
              {c[key]}
            </a>
          ))}
          <a href="#product-inquiry">{c.productEnquiry}</a>
        </div>
      </nav>
      <div className="container">
        <section className="mi-section mi-overview" id="overview">
          <h2>{c.overview}</h2>
          {item?.description_html ? (
            <div className="mi-richtext" dangerouslySetInnerHTML={{ __html: item.description_html }} />
          ) : (
            <>
              <p>{summary}</p>
              <p>{c.specHelp}</p>
            </>
          )}
          {item?.features?.length ? (
            <ul className="bullet-list">
              {item.features.map((x, i) => (
                <li key={i}>
                  {typeof x === "string" ? x : String((x as Record<string, unknown>)?.value || "")}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <section className="mi-section mi-split mi-split-top" id="specifications">
          <SpecTable locale={locale} rows={rows} />
          <div className="mi-illustration-panel">
            <Image src={art(detailArt)} alt={c.workflow} width={700} height={467} />
            <p>{c.specHelp}</p>
          </div>
        </section>
        <section className="mi-section" id="workflow">
          <Workflow title={c.workflow} items={steps} />
          <p>{c.specHelp}</p>
        </section>
        <section className="mi-section" id="documents">
          <h2>{c.documents}</h2>
          {relations.media.some((x) => x.kind !== "image") ? (
            <div className="mi-resource-list">
              {relations.media
                .filter((x) => x.kind !== "image")
                .map((x) => (
                  <a
                    className="mi-text-link"
                    key={x.id}
                    href={x.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {x.name}
                  </a>
                ))}
            </div>
          ) : (
            <ResourceRows locale={locale} small />
          )}
        </section>
        <section className="mi-section">
          <h2>{c.relatedProducts}</h2>
          <div className="mi-product-grid mi-related-grid">
            {relations.related.length
              ? relations.related.map((x) => (
                  <ProductCard
                    locale={locale}
                    title={x.name}
                    summary={x.summary}
                    image={x.image_url || art(productArt[family] || "lab-hero")}
                    path={`/products/${x.slug}`}
                    key={x.slug}
                  />
                ))
              : categories
                  .filter((x) => x.slug !== family)
                  .map((x) => (
                    <ProductCard
                      locale={locale}
                      title={c[x.key]}
                      summary={c[x.key + "Text"]}
                      image={art(productArt[x.slug])}
                      path={`/products/${x.slug}`}
                      key={x.slug}
                    />
                  ))}
          </div>
        </section>
        <section id="product-inquiry" className="mi-detail-form">
          <div>
            <h2>{c.productEnquiry}</h2>
            <p>{c.supportText}</p>
            <p>
              <Link className="mi-text-link" href={href(locale, "/contact")}>
                {c.phoneLabel}
              </Link>
            </p>
          </div>
          <InquiryForm
            locale={locale}
            initialProduct={initialProduct}
            productName={item ? `${title} (${item.sku})` : title}
          />
        </section>
      </div>
    </div>
  );
}
