"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getCopy } from "@/lib/i18n";
import { href, isLocale, type Locale } from "@/lib/site";

export default function LocalNotFound() {
  const params = useParams<{ locale?: string }>();
  const raw = params?.locale || "";
  const locale: Locale = isLocale(raw) ? raw : "en";
  const c = getCopy(locale);
  return <div className="container interior-content"><div className="empty-state"><h1>{c.notFound}</h1><Link className="button button-blue" href={href(locale)}>{c.backHome}</Link></div></div>;
}
