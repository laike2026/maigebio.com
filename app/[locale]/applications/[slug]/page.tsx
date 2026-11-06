import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { interiorCopy } from "@/lib/interior-copy";
import { applications, categories, isLocale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { applicationSummary } from "@/lib/procurement";
import {
  applicationArt,
  art,
  InteriorHero,
  ProductCard,
  productArt,
  ResourceRows,
  ScienceIcon,
  SupportCTA,
  Workflow,
  type IconName,
} from "@/components/interiors/Interior";
export async function generateStaticParams() {
  return ["en", "ar", "ru", "es"].flatMap((locale) =>
    applications.map((item) => ({ locale, slug: item.slug })),
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const item = applications.find((x) => x.slug === slug);
  if (!item) return {};
  const c = interiorCopy(locale);
  return pageMetadata(locale, c[item.key], applicationSummary(locale, item.slug), `/applications/${slug}`);
}
export default async function ApplicationDetail({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const item = applications.find((x) => x.slug === slug);
  if (!item) notFound();
  const c = interiorCopy(locale);
  const workflow =
    item.motif === "protein"
      ? ["samplePrep", "bufferExchange", "analysis"]
      : item.motif === "immunology"
        ? ["samplePrep", "reagent", "analysis"]
        : item.motif === "molecular"
          ? ["samplePrep", "filtration", "analysis"]
          : ["requirements", "faqSelection", "documentation", "communication"];
  const icons: IconName[] =
    item.motif === "biopharma"
      ? ["review", "flask", "document", "support"]
      : ["sample", item.motif === "protein" ? "filter" : "flask", "microscope"];
  const selected = categories.filter((x) =>
    item.motif === "immunology"
      ? x.slug === "elisa-kits"
      : item.motif === "molecular"
        ? x.slug === "lab-consumables"
        : item.motif === "protein"
          ? x.slug !== "elisa-kits"
          : x.slug !== "lab-consumables",
  );
  const factors =
    item.motif === "protein"
      ? [
          ["volume", "sample"],
          ["MWCO", "layers"],
          ["compatibility", "flask"],
        ]
      : item.motif === "immunology"
        ? [
            ["target", "target"],
            ["species", "dna"],
            ["sample", "drop"],
          ]
        : [
            ["sample", "sample"],
            ["format", "layers"],
            ["documentation", "document"],
          ];
  return (
    <div className="mi-page mi-application-detail">
      <InteriorHero
        locale={locale}
        title={c[item.key]}
        intro={applicationSummary(locale, item.slug)}
        currentPath={`/applications/${slug}`}
        image={applicationArt[item.motif]}
        crumbs={[{ label: c.applications, path: "/applications" }, { label: c[item.key] }]}
      />
      <div className="container mi-content">
        <Workflow
          title={c.workflow}
          items={workflow.map((key, i) => ({ title: c[key], icon: icons[i] }))}
        />
        <section className="mi-section">
          <h2>{c.workflowTitle}</h2>
          <div className="mi-product-grid">
            {selected.map((x) => (
              <ProductCard
                locale={locale}
                key={x.slug}
                title={c[x.key]}
                summary={c[x.key + "Text"]}
                image={art(productArt[x.slug])}
                path={`/products/${x.slug}`}
              />
            ))}
          </div>
        </section>
        <section className="mi-section">
          <h2>{c.considerations}</h2>
          <ul className="mi-considerations">
            {factors.map(([key, icon]) => (
              <li key={key}>
                <ScienceIcon name={icon as IconName} size={36} />
                <div>
                  <h3>{c[key] || key}</h3>
                  <p>{c.specHelp}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>{c.resources}</h2>
          <ResourceRows locale={locale} small />
        </section>
        <SupportCTA locale={locale} />
      </div>
    </div>
  );
}
