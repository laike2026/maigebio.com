"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { IconArrowsMaximize, IconX } from "@tabler/icons-react";
export default function ProductGallery({
  images,
  title,
  enlarge,
  close,
  note,
}: {
  images: string[];
  title: string;
  enlarge: string;
  close: string;
  note?: string;
}) {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const list = [...new Set(images)].filter(Boolean);
  return (
    <div className="mi-gallery">
      <button
        className="mi-gallery-main"
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={enlarge}
      >
        <Image
          src={list[selected]}
          alt={title}
          width={900}
          height={675}
          sizes="(max-width: 760px) 100vw, 50vw"
          priority
        />
        <IconArrowsMaximize size={23} aria-hidden="true" />
      </button>
      {list.length > 1 && (
        <div className="mi-thumbnails">
          {list.map((src, index) => (
            <button
              type="button"
              key={src}
              aria-label={`${title} ${index + 1}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <Image src={src} width={140} height={100} alt="" />
            </button>
          ))}
        </div>
      )}
      {note && <p className="mi-image-note">{note}</p>}
      <dialog
        ref={dialog}
        className="mi-image-dialog"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="mi-dialog-close"
          type="button"
          onClick={() => dialog.current?.close()}
          aria-label={close}
        >
          <IconX />
        </button>
        <Image src={list[selected]} alt={title} width={1400} height={1050} sizes="90vw" />
      </dialog>
    </div>
  );
}
