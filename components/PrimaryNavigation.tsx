"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import { getCopy } from "@/lib/i18n";
import { href, type Locale } from "@/lib/site";

type GroupId = "products" | "applications" | "resources" | "about";

export default function PrimaryNavigation({ locale }: { locale: Locale }) {
  const c = getCopy(locale);
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopRef = useRef<HTMLElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const desktopButtons = useRef<Partial<Record<GroupId, HTMLButtonElement | null>>>({});
  const mobileButtons = useRef<Partial<Record<GroupId, HTMLButtonElement | null>>>({});

  const groups: { id: GroupId; label: string; links: { label: string; path: string }[] }[] = [
    { id: "products", label: c.navProducts, links: [
      { label: c.productCenter, path: "/products" },
      { label: c.dialysis, path: "/products/dialysis-tubing" },
      { label: c.elisa, path: "/products/elisa-kits" },
    ] },
    { id: "applications", label: c.navApplications, links: [
      { label: c.applications, path: "/applications" },
      { label: c.protein, path: "/applications/protein-research" },
      { label: c.immunology, path: "/applications/immunology" },
    ] },
    { id: "resources", label: c.navResources, links: [
      { label: c.resourcesTitle, path: "/resources" },
      { label: c.blogTitle, path: "/blog" },
      { label: c.faqTitle, path: "/faq" },
    ] },
    { id: "about", label: c.navAbout, links: [
      { label: c.aboutTitle, path: "/about" },
      { label: c.qualityTitle, path: "/manufacturing-quality" },
    ] },
  ];

  useEffect(() => {
    setOpenGroup(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (target instanceof Element && target.closest(".language-switcher")) {
        setOpenGroup(null);
      }
      if (desktopRef.current?.contains(target) || mobileRef.current?.contains(target)) return;
      setOpenGroup(null);
      setMobileOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (openGroup) {
        event.preventDefault();
        (mobileOpen ? mobileButtons.current : desktopButtons.current)[openGroup]?.focus();
        setOpenGroup(null);
      } else if (mobileOpen) {
        event.preventDefault();
        mobileToggleRef.current?.focus();
        setMobileOpen(false);
      }
    }
    function onBreakpointChange() {
      setOpenGroup(null);
      setMobileOpen(false);
    }
    const breakpoint = window.matchMedia("(max-width: 900px)");
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    breakpoint.addEventListener("change", onBreakpointChange);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      breakpoint.removeEventListener("change", onBreakpointChange);
    };
  }, [openGroup, mobileOpen]);

  function closeMenus() {
    setOpenGroup(null);
    setMobileOpen(false);
  }

  function linksFor(mode: "desktop" | "mobile") {
    return <>
      {groups.map((group) => {
        const panelId = `nav-${mode}-${group.id}`;
        const expanded = openGroup === group.id;
        return <div className="nav-drop" key={group.id}>
          <button
            type="button"
            className="nav-trigger"
            aria-expanded={expanded}
            aria-controls={panelId}
            ref={(element) => { (mode === "mobile" ? mobileButtons : desktopButtons).current[group.id] = element; }}
            onClick={() => setOpenGroup(expanded ? null : group.id)}
          >
            {group.label}<span className="nav-chevron" aria-hidden="true">⌄</span>
          </button>
          {expanded && <div className="nav-menu" id={panelId}>
            {group.links.map((link) => <Link key={link.path} href={href(locale, link.path)} onClick={closeMenus}>{link.label}</Link>)}
          </div>}
        </div>;
      })}
      <Link href={href(locale, "/oem-odm")} onClick={closeMenus}>{c.navOem}</Link>
      <Link href={href(locale, "/contact")} onClick={closeMenus}>{c.navContact}</Link>
    </>;
  }

  return <>
    <nav className="desktop-nav" aria-label="Main navigation" ref={desktopRef}>{linksFor("desktop")}</nav>
    <div className="mobile-menu" ref={mobileRef}>
      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={c.menu}
        aria-expanded={mobileOpen}
        aria-controls="mobile-navigation"
        ref={mobileToggleRef}
        onClick={() => { setMobileOpen(!mobileOpen); setOpenGroup(null); }}
      >☰</button>
      {mobileOpen && <nav id="mobile-navigation" aria-label="Mobile navigation">
        {linksFor("mobile")}
        <LanguageSwitcher locale={locale} />
        <Link className="button button-green" href={href(locale, "/contact")} onClick={closeMenus}>{c.quote}</Link>
      </nav>}
    </div>
  </>;
}
