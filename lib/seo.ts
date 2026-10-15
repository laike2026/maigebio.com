import type { Metadata } from "next";
import { locales, type Locale } from "./site";

export function pageMetadata(locale: Locale, title: string, description: string, path = ""): Metadata {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const assetOrigin = site || "https://maigebio.com";
  const socialImage = `${assetOrigin}/images/brand/maige-social.png`;
  const languages = Object.fromEntries(locales.map((item) => [item, site ? `${site}/${item}${path}` : `/${item}${path}`]));
  return {
    title,
    description,
    alternates: { canonical: site ? `${site}/${locale}${path}` : `/${locale}${path}`, languages: { ...languages, "x-default": site ? `${site}/en${path}` : `/en${path}` } },
    openGraph: { title, description, type: "website", siteName: "MAIGE Bioscience", url: site ? `${site}/${locale}${path}` : undefined, images: [{ url: socialImage, width: 1200, height: 630, alt: "MAIGE Bioscience official logo and life science research products" }] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
    robots: { index: Boolean(site && process.env.NEXT_PUBLIC_INDEXABLE === "true"), follow: Boolean(site && process.env.NEXT_PUBLIC_INDEXABLE === "true") },
  };
}

export function applyContentSeo(meta: Metadata, seo: Record<string, unknown>): Metadata {
  if (typeof seo.keywords === "string" && seo.keywords) meta.keywords = seo.keywords.split(",").map((word) => word.trim()).filter(Boolean);
  if (typeof seo.canonical === "string" && seo.canonical.startsWith("https://")) meta.alternates = { ...meta.alternates, canonical: seo.canonical };
  if (seo.noindex === true) meta.robots = { index: false, follow: false };
  const title = typeof seo.ogTitle === "string" && seo.ogTitle ? seo.ogTitle : undefined;
  const description = typeof seo.ogDescription === "string" && seo.ogDescription ? seo.ogDescription : undefined;
  const image = typeof seo.ogImage === "string" && seo.ogImage.startsWith("https://") ? seo.ogImage : undefined;
  if (title || description || image) meta.openGraph = { ...meta.openGraph, title: title || String(meta.title || ""), description: description || String(meta.description || ""), images: image ? [{ url: image }] : meta.openGraph?.images };
  return meta;
}
