import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight,
  IconBook,
  IconDna2,
  IconFileText,
  IconFlask,
  IconHeadset,
  IconMicroscope,
  IconPackage,
  IconTestPipe,
  IconFilter,
  IconClipboardCheck,
  IconShieldCheck,
  IconMail,
  IconLayersIntersect,
  IconCell,
  IconTarget,
  IconDroplet,
  IconRulerMeasure,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import { interiorCopy } from "@/lib/interior-copy";
import { href, type Locale } from "@/lib/site";

const icons = {
  arrow: IconArrowRight,
  book: IconBook,
  dna: IconDna2,
  document: IconFileText,
  flask: IconFlask,
  support: IconHeadset,
  microscope: IconMicroscope,
  package: IconPackage,
  sample: IconTestPipe,
  filter: IconFilter,
  review: IconClipboardCheck,
  shield: IconShieldCheck,
  mail: IconMail,
  layers: IconLayersIntersect,
  antibody: IconCell,
  target: IconTarget,
  drop: IconDroplet,
  ruler: IconRulerMeasure,
};
export type IconName = keyof typeof icons;
export function ScienceIcon({ name, size = 32 }: { name: IconName; size?: number }) {
  const Icon = icons[name];
  return <Icon size={size} stroke={1.5} aria-hidden="true" />;
}
export const art = (name: string) => `/images/interiors/${name}.webp`;
export const applicationArt: Record<string, string> = {
  protein: "protein-hero",
  immunology: "immunology-hero",
  molecular: "molecular-hero",
  biopharma: "biopharma-hero",
};
export const productArt: Record<string, string> = {
  "dialysis-tubing": "dialysis-product",
  "elisa-kits": "elisa-product",
  "lab-consumables": "strainer-product",
};

export function InteriorHero({
  locale,
  title,
  intro,
  image = "lab-hero",
  crumbs,
  compact = false,
  children,
}: {
  locale: Locale;
  title: string;
  intro?: string;
  image?: string | null;
  crumbs?: { label: string; path?: string }[];
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="container mi-breadcrumb">
        <Breadcrumb locale={locale} items={crumbs || [{ label: title }]} />
      </div>
      <header className={`mi-hero${compact ? " mi-hero-compact" : ""}${!image ? " mi-hero-text" : ""}`}>
        {image && (
          <Image src={art(image)} alt="" fill sizes="100vw" className="mi-hero-image" priority />
        )}
        <div className="container">
          <div className="mi-hero-copy">
            <h1>{title}</h1>
            {intro && <p>{intro}</p>}
            {children}
          </div>
        </div>
      </header>
    </>
  );
}
export function SupportCTA({
  locale,
  title,
  intro,
  path = "/contact",
  label,
}: {
  locale: Locale;
  title?: string;
  intro?: string;
  path?: string;
  label?: string;
}) {
  const c = interiorCopy(locale);
  return (
    <section className="mi-support">
      <ScienceIcon name="support" size={48} />
      <div>
        <h2>{title || c.needHelp}</h2>
        <p>{intro || c.supportText}</p>
      </div>
      <Link className="button button-green" href={href(locale, path)}>
        {label || c.askTechnical}
        <ScienceIcon name="arrow" size={20} />
      </Link>
    </section>
  );
}
export function Workflow({
  title,
  items,
}: {
  title?: string;
  items: { title: string; text?: string; icon: IconName }[];
}) {
  return (
    <section className="mi-workflow-section">
      {title && <h2>{title}</h2>}
      <ol className="mi-workflow" style={{ "--steps": items.length } as React.CSSProperties}>
        {items.map((item, index) => (
          <li key={item.title}>
            <span className="mi-icon-round">
              <ScienceIcon name={item.icon} size={44} />
            </span>
            <h3>{item.title}</h3>
            {item.text && <p>{item.text}</p>}
            {index < items.length - 1 && (
              <span className="mi-step-arrow">
                <ScienceIcon name="arrow" size={26} />
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
export function ProductCard({
  locale,
  title,
  summary,
  image,
  path,
  sku,
  row = false,
}: {
  locale: Locale;
  title: string;
  summary: string;
  image: string;
  path: string;
  sku?: string;
  row?: boolean;
}) {
  const c = interiorCopy(locale);
  return (
    <article className={`mi-product-card${row ? " mi-product-row" : ""}`}>
      <Link href={href(locale, path)}>
        <div className="mi-product-picture">
          <Image
            src={image}
            alt={title}
            width={640}
            height={480}
            sizes="(max-width: 650px) 100vw, 45vw"
          />
        </div>
        <div className="mi-product-card-copy">
          {sku && <p className="mi-kicker">{sku}</p>}
          <h2>{title}</h2>
          <p>{summary}</p>
          <span className="mi-text-link">
            {c.viewDetails}
            <ScienceIcon name="arrow" size={19} />
          </span>
        </div>
      </Link>
    </article>
  );
}
export function ResourceRows({
  locale,
  small = false,
  query = "",
}: {
  locale: Locale;
  small?: boolean;
  query?: string;
}) {
  const c = interiorCopy(locale);
  const rows: { key: string; icon: IconName }[] = [
    { key: "catalog", icon: "book" },
    { key: "datasheets", icon: "document" },
    { key: "notes", icon: "flask" },
    { key: "guides", icon: "review" },
  ];
  const visible = rows.filter(
    (item) =>
      !query || (c[item.key] + " " + c[item.key + "Text"]).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className={`mi-resource-list${small ? " mi-resource-small" : ""}`}>
      {visible.map((item) => (
        <article className="mi-resource-row" key={item.key}>
          <span className="mi-resource-symbol">
            <ScienceIcon name={item.icon} size={40} />
          </span>
          {!small && <Image src={art("documents")} alt="" width={150} height={160} sizes="120px" />}
          <div>
            <h2>{c[item.key]}</h2>
            <p>{c[item.key + "Text"]}</p>
          </div>
          <Link
            className="button button-outline"
            href={href(locale, "/contact") + `?document=${item.key}`}
          >
            {c.requestFile}
            <ScienceIcon name="arrow" size={18} />
          </Link>
        </article>
      ))}
      {!visible.length && (
        <div className="mi-empty">
          <h2>{c.noResults}</h2>
          <Link className="mi-text-link" href={href(locale, "/contact")}>
            {c.askTechnical}
          </Link>
        </div>
      )}
    </div>
  );
}
export function SpecTable({ rows, locale }: { rows: [string, string][]; locale: Locale }) {
  const c = interiorCopy(locale);
  return (
    <div className="mi-table-scroll">
      <table className="mi-spec-table">
        <caption>{c.specifications}</caption>
        <tbody>
          {rows.map(([name, value]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
