export const locales = ["en", "ar", "ru", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const whatsappUrl = "https://wa.me/qr/HLNDA5AQMXHME1";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function href(locale: Locale, path = "") {
  return `/${locale}${path}`;
}

export const categories = [
  { slug: "dialysis-tubing", image: "/images/products/dialysis-illustration.png", key: "dialysis" },
  { slug: "elisa-kits", image: "/images/products/elisa-illustration.png", key: "elisa" },
] as const;

export const applications = [
  { slug: "protein-research", key: "protein", motif: "protein" },
  { slug: "immunology", key: "immunology", motif: "immunology" },
  { slug: "molecular-biology", key: "molecular", motif: "molecular" },
  { slug: "biopharmaceutical-research", key: "biopharma", motif: "biopharma" },
] as const;

export const articles = [
  { slug: "choosing-dialysis-tubing", key: "articleDialysis" },
  { slug: "understanding-elisa-workflows", key: "articleElisa" },
] as const;
