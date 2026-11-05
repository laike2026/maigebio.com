import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { interiorCopy } from "@/lib/interior-copy";
import { applications, href, isLocale } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import {
  applicationArt,
  art,
  InteriorHero,
  ScienceIcon,
  SupportCTA,
} from "@/components/interiors/Interior";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = interiorCopy(locale);
  return pageMetadata(locale, c.applications, c.applicationsText, "/applications");
}
export default async function Applications({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = interiorCopy(locale);
  return (
    <div className="mi-page">
      <InteriorHero
        locale={locale}
        title={c.applicationHeading}
        intro={c.applicationsText}
        crumbs={[{ label: c.applications }]}
      />
      <div className="container mi-content">
        <div className="mi-application-list">
          {applications.map((item, i) => (
            <article className="mi-application-row" key={item.slug}>
              <Link
                className="mi-application-image"
                href={href(locale, `/applications/${item.slug}`)}
                tabIndex={-1}
                aria-hidden="true"
              >
                <Image
                  src={art(applicationArt[item.motif])}
                  alt=""
                  width={800}
                  height={450}
                  sizes="(max-width:480px) 100vw, 50vw"
                />
              </Link>
              <div className="mi-application-copy">
                <ScienceIcon name={(["layers", "antibody", "dna", "flask"] as const)[i]} size={44} />
                <h2>{c[item.key]}</h2>
                <p>{c.applicationsText}</p>
                <Link className="mi-text-link" href={href(locale, `/applications/${item.slug}`)}>
                  {c.learnMore}
                  <ScienceIcon name="arrow" size={20} />
                </Link>
              </div>
            </article>
          ))}
        </div>
        <SupportCTA locale={locale} />
      </div>
    </div>
  );
}
