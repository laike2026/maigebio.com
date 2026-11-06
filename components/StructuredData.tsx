export function absoluteSiteUrl(path: string) {
  try {
    const url = new URL(path, process.env.NEXT_PUBLIC_SITE_URL || "https://maigebio.com");
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export default function StructuredData({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
