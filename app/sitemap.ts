import type { MetadataRoute } from "next";
import { applications, articles, categories, locales } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!site || process.env.NEXT_PUBLIC_INDEXABLE !== "true") return [];
  const paths = ["", "/products", ...categories.map((item) => `/products/${item.slug}`), "/applications", ...applications.map((item) => `/applications/${item.slug}`), "/about", "/manufacturing-quality", "/oem-odm", "/resources", "/blog", ...articles.map((item) => `/blog/${item.slug}`), "/faq", "/contact", "/privacy-policy", "/terms"];
  return locales.flatMap((locale) => paths.map((path) => ({ url: `${site}/${locale}${path}`, changeFrequency: "monthly" as const, priority: path === "" ? 1 : .6, alternates: { languages: Object.fromEntries(locales.map((item) => [item, `${site}/${item}${path}`])) } })));
}
