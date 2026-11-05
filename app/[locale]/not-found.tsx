"use client";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { interiorCopy } from "@/lib/interior-copy";
import { href, isLocale } from "@/lib/site";
export default function LocalNotFound() {
  const params = useParams<{ locale?: string }>();
  const locale = isLocale(params?.locale || "") ? (params.locale! as "en" | "ar" | "ru" | "es") : "en";
  const c = interiorCopy(locale);
  return (
    <div className="mi-page">
      <div className="container mi-not-found">
        <Image src="/images/interiors/not-found.webp" alt="" width={1000} height={570} priority />
        <p className="mi-code">404</p>
        <h1>{c.pageMissing}</h1>
        <p>{c.supportText}</p>
        <div className="mi-actions">
          <Link href={href(locale, "/products")} className="button button-green">
            {c.browseProducts}
          </Link>
          <Link href={href(locale, "/contact")} className="button button-outline">
            {c.navContact}
          </Link>
        </div>
        <form className="mi-search" action={href(locale, "/products")}>
          <input name="q" type="search" placeholder={c.searchPlaceholder} aria-label={c.search} />
          <button className="button button-blue">{c.search}</button>
        </form>
      </div>
    </div>
  );
}
