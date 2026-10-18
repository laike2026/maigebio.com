import Link from "next/link";
import { href, type Locale } from "@/lib/site";

export default function LegalDetails({ locale, kind }: { locale: Locale; kind: "privacy" | "terms" }) {
  if (kind === "terms") return <div className="legal-panel">
    <p>Effective 14 October 2026. This website is operated by MAIGE for business enquiries about life science research products.</p>
    <h2>Product information</h2>
    <p>Product categories, images and research guidance on this site are general information. Illustrations and design reference images do not document actual inventory, facilities or product specifications. Please request a current quotation and approved technical documents before purchasing or using a product. No website content is a binding offer or a medical or diagnostic claim.</p>
    <h2>Enquiries and external links</h2>
    <p>Sending an enquiry does not create an order or supply agreement. A sale is subject to written confirmation of specifications, availability, price and applicable terms. WhatsApp and other external links are operated by third parties under their own terms.</p>
    <h2>Contact</h2>
    <p>For questions about this website, contact <a href="mailto:info@maigebio.com">info@maigebio.com</a> or use the <Link href={href(locale, "/contact")}>contact page</Link>.</p>
  </div>;

  return <div className="legal-panel">
    <p>Effective 14 October 2026. MAIGE operates this website. For privacy requests, contact <a href="mailto:info@maigebio.com">info@maigebio.com</a>.</p>
    <h2>Information we receive</h2>
    <p>When you send an enquiry, we receive the name, company, email address, country or region, product interest and message you provide. We also receive the page and campaign source associated with the enquiry. Please do not submit sensitive personal information in the message field.</p>
    <h2>How we use it</h2>
    <p>We use enquiry information to respond, discuss specifications and quotations, and keep a record of the correspondence. We do not use the enquiry form to subscribe you to marketing emails. Enquiry messages are delivered through our email service provider to our business inbox at info@maigebio.com. Our website is hosted by a cloud service provider.</p>
    <h2>Analytics and external services</h2>
    <p>Google Analytics runs only if you select “Allow analytics” in the site’s analytics control. You can change that choice using “Analytics settings”. If you choose to contact us through WhatsApp, its own privacy terms apply. Our service providers may process information in countries outside your own.</p>
    <h2>Retention and your choices</h2>
    <p>We keep enquiry correspondence while needed to respond and manage the business relationship, and longer where required for legal records. You can ask us to access, correct or delete your enquiry information by emailing info@maigebio.com; we will assess requests under applicable law.</p>
    <h2>Updates</h2>
    <p>We may update this notice as the website and its services change. The effective date above identifies the current version.</p>
  </div>;
}
