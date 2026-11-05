"use client";
import { useRef } from "react";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
export default function ProductSpecPicker({
  title,
  fields,
  placeholder,
  heading,
  quote,
  information,
  resourceUrl,
}: {
  title: string;
  fields: string[];
  placeholder: string;
  heading: string;
  quote: string;
  information: string;
  resourceUrl: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  function transfer() {
    const values = [...(root.current?.querySelectorAll<HTMLInputElement>("input") || [])]
      .filter((i) => i.value.trim())
      .map((i) => `${i.name}: ${i.value.trim()}`);
    window.dispatchEvent(
      new CustomEvent("maige-spec-selection", {
        detail: { product: title, message: [title, ...values].join("\n") },
      }),
    );
  }
  return (
    <div className="mi-picker" ref={root}>
      <h2>{heading}</h2>
      <div className="mi-picker-fields">
        {fields.map((field) => (
          <label key={field}>
            {field}
            <input name={field} placeholder={placeholder} maxLength={120} />
          </label>
        ))}
      </div>
      <div className="mi-actions">
        <a className="button button-green" href="#product-inquiry" onClick={transfer}>
          {quote}
          <IconArrowRight size={19} aria-hidden="true" />
        </a>
        <Link className="button button-outline" href={resourceUrl}>
          {information}
        </Link>
      </div>
    </div>
  );
}
