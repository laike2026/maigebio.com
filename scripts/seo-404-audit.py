"""Check the published sitemap, internal links, hreflang and retired sample articles.

Run: python3 scripts/seo-404-audit.py
Uses only the Python standard library and exits nonzero on a regression.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from urllib.error import HTTPError
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen
import json
import sys
import time
import xml.etree.ElementTree as ET

BASE = "https://maigebio.com"
LOCALES = ("en", "ar", "ru", "es")
RETIRED_SLUGS = ("understanding-elisa-workflows", "choosing-dialysis-tubing")
HEADERS = {"User-Agent": "MAIGE-Site-QA/1.0"}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


DIRECT_OPENER = build_opener(NoRedirect)


def fetch(url):
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=25) as response:
                return response.status, response.geturl(), response.read(), response.headers.get("content-type", "")
        except HTTPError as error:
            return error.code, url, error.read(), error.headers.get("content-type", "")
        except Exception as error:
            if attempt == 2:
                return None, url, str(error).encode(), ""
            time.sleep(0.5 * (attempt + 1))


def direct_redirect(url):
    for attempt in range(3):
        try:
            with DIRECT_OPENER.open(Request(url, headers=HEADERS), timeout=25) as response:
                return response.status, response.headers.get("Location")
        except HTTPError as error:
            return error.code, error.headers.get("Location")
        except Exception:
            if attempt == 2:
                return None, None
            time.sleep(0.5 * (attempt + 1))


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = []
        self.hreflang = {}
        self.robots = []
        self.links = []
        self.h1 = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        rel = attrs.get("rel", "").split()
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "h1":
            self.h1 += 1
        if tag == "link" and "canonical" in rel:
            self.canonical.append(attrs.get("href"))
        if tag == "link" and "alternate" in rel and attrs.get("hreflang"):
            self.hreflang[attrs["hreflang"]] = attrs.get("href")
        if tag == "meta" and attrs.get("name", "").lower() in ("robots", "googlebot"):
            self.robots.append(attrs.get("content", ""))


def page_result(url):
    status, final, body, content_type = fetch(url)
    parser = Page()
    if status == 200 and "html" in content_type:
        parser.feed(body.decode("utf-8", "replace"))
    return status, final, parser


def main():
    issues = []
    robots_status, _, robots_body, _ = fetch(f"{BASE}/robots.txt")
    robots_text = robots_body.decode("utf-8", "replace")
    if robots_status != 200 or "Allow: /" not in robots_text or f"Sitemap: {BASE}/sitemap.xml" not in robots_text:
        issues.append("robots.txt does not expose the indexable sitemap and allow crawling")
    status, final, body, _ = fetch(f"{BASE}/sitemap.xml")
    if status != 200 or final != f"{BASE}/sitemap.xml":
        raise RuntimeError(f"Sitemap did not return a direct 200: {status} {final}")
    root = ET.fromstring(body)
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    urls = [node.text for node in root.findall(f".//{ns}loc") if node.text]
    if not urls or len(urls) != len(set(urls)):
        raise RuntimeError("Sitemap is empty or contains duplicate URLs")

    pages = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(page_result, url): url for url in urls}
        for future in as_completed(futures):
            pages[futures[future]] = future.result()

    internal = set()
    for url, (page_status, page_final, page) in pages.items():
        if page_status != 200 or page_final != url:
            issues.append(f"{url}: sitemap entry is {page_status}, final {page_final}")
        if page.canonical != [url]:
            issues.append(f"{url}: canonical is {page.canonical}")
        if any("noindex" in value.lower() for value in page.robots):
            issues.append(f"{url}: marked noindex")
        if page.h1 != 1:
            issues.append(f"{url}: expected one H1, found {page.h1}")

        path = urlparse(url).path
        parts = path.split("/", 2)
        if len(parts) < 2 or parts[1] not in LOCALES:
            issues.append(f"{url}: unexpected locale path")
            continue
        suffix = f"/{parts[2]}" if len(parts) == 3 and parts[2] else ""
        for locale in LOCALES:
            expected = f"{BASE}/{locale}{suffix}"
            if page.hreflang.get(locale) != expected or expected not in pages:
                issues.append(f"{url}: {locale} hreflang is {page.hreflang.get(locale)}, expected {expected}")
        if page.hreflang.get("x-default") != f"{BASE}/en{suffix}":
            issues.append(f"{url}: x-default hreflang is {page.hreflang.get('x-default')}")

        for href in page.links:
            target = urldefrag(urljoin(url, href))[0].split("?", 1)[0]
            if urlparse(target).netloc in ("maigebio.com", "www.maigebio.com"):
                internal.add(target)

    additional = sorted(internal - pages.keys())
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fetch, target): target for target in additional}
        for future in as_completed(futures):
            target = futures[future]
            link_status, link_final, _, _ = future.result()
            if link_status != 200 or link_final != target:
                issues.append(f"Internal link {target}: {link_status}, final {link_final}")

    retired = {}
    for locale in LOCALES:
        for slug in RETIRED_SLUGS:
            url = f"{BASE}/{locale}/blog/{slug}"
            old_status, _, old_body, _ = fetch(url)
            retired[url] = old_status
            if old_status != 404:
                issues.append(f"Retired article {url}: expected 404, got {old_status}")
            if url in urls or url in internal:
                issues.append(f"Retired article {url}: still in sitemap or internal links")
            if old_status == 404 and b"noindex" not in old_body.lower():
                issues.append(f"Retired article {url}: missing noindex")

    slash_variants = [f"{BASE}/{locale}/blog/" for locale in LOCALES]
    slash_variants += [f"{url}/" for url in retired]
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(direct_redirect, url): url for url in slash_variants}
        for future in as_completed(futures):
            url = futures[future]
            redirect_status, location = future.result()
            expected = url.rstrip("/")
            if redirect_status != 308 or not location or urljoin(url, location) != expected:
                issues.append(f"Trailing slash {url}: {redirect_status} to {location}, expected 308 to {expected}")

    print(json.dumps({
        "robots_status": robots_status,
        "sitemap_urls": len(urls),
        "internal_targets": len(internal),
        "retired_article_statuses": retired,
        "trailing_slash_variants": len(slash_variants),
        "issues": issues,
    }, ensure_ascii=False, indent=2))
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
