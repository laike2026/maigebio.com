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
  { slug: "dialysis-tubing", image: "/images/products/maige-dry-dialysis-membranes.png", key: "dialysis" },
  { slug: "elisa-kits", image: "/images/products/maige-elisa-kit.png", key: "elisa" },
  { slug: "lab-consumables", image: "/images/products/maige-cell-strainers.png", key: "labConsumables" },
] as const;

export const applications = [
  { slug: "protein-research", key: "protein", motif: "protein" },
  { slug: "immunology", key: "immunology", motif: "immunology" },
  { slug: "molecular-biology", key: "molecular", motif: "molecular" },
  { slug: "biopharmaceutical-research", key: "biopharma", motif: "biopharma" },
] as const;
