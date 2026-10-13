import Link from "next/link";
import { getCopy } from "@/lib/i18n";
import { href, type Locale } from "@/lib/site";

export default function Breadcrumb({ locale, items }: { locale: Locale; items: { label: string; path?: string }[] }) {
  const c = getCopy(locale);
  return <nav className="breadcrumb" aria-label="Breadcrumb"><Link href={href(locale)}>{c.home}</Link>{items.map((item, index) => <span key={`${item.label}-${index}`}><span aria-hidden="true">/</span>{item.path ? <Link href={href(locale, item.path)}>{item.label}</Link> : <strong aria-current="page">{item.label}</strong>}</span>)}</nav>;
}
