import type { Metadata } from "next";
import { locales, type Locale } from "./site";

export function pageMetadata(locale: Locale, title: string, description: string, path = ""): Metadata {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const languages = Object.fromEntries(locales.map((item) => [item, site ? `${site}/${item}${path}` : `/${item}${path}`]));
  return {
    title,
    description,
    alternates: { canonical: site ? `${site}/${locale}${path}` : `/${locale}${path}`, languages: { ...languages, "x-default": site ? `${site}/en${path}` : `/en${path}` } },
    openGraph: { title, description, type: "website", url: site ? `${site}/${locale}${path}` : undefined },
    robots: { index: Boolean(site && process.env.NEXT_PUBLIC_INDEXABLE === "true"), follow: Boolean(site && process.env.NEXT_PUBLIC_INDEXABLE === "true") },
  };
}
