import type { Metadata } from "next";
import { locales, type Locale } from "./site";
import { getSeoSettings } from "./seo-settings";

export async function pageMetadata(
  locale: Locale,
  title: string,
  description: string,
  path = "",
  options: { paths?: Partial<Record<Locale, string>>; index?: boolean } = {},
): Promise<Metadata> {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const assetOrigin = site || "https://maigebio.com";
  const socialImage = `${assetOrigin}/images/brand/maige-social.png`;
  const paths = options.paths ?? Object.fromEntries(locales.map((item) => [item, path]));
  const languages = Object.fromEntries(Object.entries(paths).map(([item, alternate]) => [item, `${site || ""}/${item}${alternate}`]));
  if (languages.en) languages["x-default"] = languages.en;
  const settings = await getSeoSettings();
  const enabled = Boolean(site && process.env.NEXT_PUBLIC_INDEXABLE === "true" && settings.indexingEnabled);
  return {
    title,
    description,
    alternates: { canonical: `${site || ""}/${locale}${path}`, languages: options.index === false ? {} : languages },
    openGraph: { title, description, type: "website", siteName: "MAIGE Bioscience", url: site ? `${site}/${locale}${path}` : undefined, images: [{ url: socialImage, width: 1200, height: 630, alt: "MAIGE Bioscience official logo and life science research products" }] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
    robots: { index: enabled && options.index !== false, follow: enabled },
  };
}

export function applyContentSeo(meta: Metadata, seo: Record<string, unknown>): Metadata {
  if (typeof seo.keywords === "string" && seo.keywords) meta.keywords = seo.keywords.split(",").map((word) => word.trim()).filter(Boolean);
  if (typeof seo.canonical === "string" && seo.canonical.startsWith("https://") && seo.canonical !== meta.alternates?.canonical) {
    meta.alternates = { canonical: seo.canonical };
    if (meta.openGraph) meta.openGraph.url = seo.canonical;
  }
  if (seo.noindex === true) {
    meta.robots = { index: false, follow: false };
    if (meta.alternates) meta.alternates.languages = {};
  }
  const title = typeof seo.ogTitle === "string" && seo.ogTitle ? seo.ogTitle : undefined;
  const description = typeof seo.ogDescription === "string" && seo.ogDescription ? seo.ogDescription : undefined;
  const image = typeof seo.ogImage === "string" && seo.ogImage.startsWith("https://") ? seo.ogImage : undefined;
  if (title || description || image) meta.openGraph = { ...meta.openGraph, title: title || String(meta.title || ""), description: description || String(meta.description || ""), images: image ? [{ url: image }] : meta.openGraph?.images };
  return meta;
}
