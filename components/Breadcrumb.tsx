import Link from "next/link";
import { getCopy } from "@/lib/i18n";
import { href, type Locale } from "@/lib/site";
import StructuredData, { absoluteSiteUrl } from "./StructuredData";

export default function Breadcrumb({ locale, items, currentPath }: { locale: Locale; items: { label: string; path?: string }[]; currentPath?: string }) {
  const c = getCopy(locale);
  const steps = [{ label: c.home, path: "" }, ...items];
  return <><nav className="breadcrumb" aria-label="Breadcrumb"><Link href={href(locale)}>{c.home}</Link>{items.map((item, index) => <span key={`${item.label}-${index}`}><span aria-hidden="true">/</span>{item.path ? <Link href={href(locale, item.path)}>{item.label}</Link> : <strong aria-current="page">{item.label}</strong>}</span>)}</nav>
    {currentPath && <StructuredData data={{
      "@type": "BreadcrumbList",
      itemListElement: steps.map((step, index) => ({
        "@type": "ListItem", position: index + 1, name: step.label,
        item: absoluteSiteUrl(href(locale, step.path ?? currentPath)),
      })),
    }} />}
  </>;
}
