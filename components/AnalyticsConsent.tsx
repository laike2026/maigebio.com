"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/site";

type Choice = "accepted" | "declined" | "unset";

const copy: Record<Locale, { message: string; accept: string; decline: string; settings: string }> = {
  en: { message: "We use Google Analytics to understand website visits. You can choose whether to allow this.", accept: "Allow analytics", decline: "Decline", settings: "Analytics settings" },
  ar: { message: "نستخدم Google Analytics لفهم زيارات الموقع. يمكنك اختيار السماح بذلك أو رفضه.", accept: "السماح بالتحليلات", decline: "رفض", settings: "إعدادات التحليلات" },
  ru: { message: "Мы используем Google Analytics для анализа посещений сайта. Вы можете разрешить или отклонить сбор данных.", accept: "Разрешить аналитику", decline: "Отклонить", settings: "Настройки аналитики" },
  es: { message: "Usamos Google Analytics para comprender las visitas al sitio. Puedes permitirlo o rechazarlo.", accept: "Permitir análisis", decline: "Rechazar", settings: "Ajustes de análisis" },
};

const storageKey = "maige-analytics-choice";

function sendPageView(pathname: string) {
  window.gtag?.("event", "page_view", {
    page_location: new URL(pathname, window.location.origin).href,
    page_path: pathname,
    page_title: document.title,
  });
}

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function AnalyticsConsent({ locale, measurementId }: { locale: Locale; measurementId?: string }) {
  const pathname = usePathname();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const lastPath = useRef<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setChoice(saved === "accepted" || saved === "declined" ? saved : "unset");
  }, []);

  useEffect(() => {
    if (choice !== "accepted" || !loaded.current || lastPath.current === pathname) return;
    sendPageView(pathname);
    lastPath.current = pathname;
  }, [choice, pathname]);

  if (!measurementId || choice === null) return null;

  function choose(next: Exclude<Choice, "unset">) {
    localStorage.setItem(storageKey, next);
    setChoice(next);
    setShowSettings(false);
    window.dispatchEvent(new CustomEvent("maige-analytics-consent", { detail: next }));
    if (next === "declined" && loaded.current) window.location.reload();
  }

  const visible = choice === "unset" || showSettings;
  const c = copy[locale];

  return <>
    {choice === "accepted" && <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
      strategy="afterInteractive"
      onReady={() => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = (...args: unknown[]) => { window.dataLayer?.push(args); };
        window.gtag("js", new Date());
        window.gtag("config", measurementId, { send_page_view: false });
        sendPageView(pathname);
        lastPath.current = pathname;
        loaded.current = true;
      }}
    />}
    {visible ? <section className="analytics-consent" aria-label={c.settings}>
      <p>{c.message}</p>
      <div><button type="button" onClick={() => choose("declined")}>{c.decline}</button><button type="button" className="button button-blue" onClick={() => choose("accepted")}>{c.accept}</button></div>
    </section> : <button type="button" className="analytics-settings" onClick={() => setShowSettings(true)}>{c.settings}</button>}
  </>;
}
