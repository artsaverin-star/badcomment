"use client";

import { useState } from "react";

// Admin: one ready-to-publish social post — copyable caption + a 4-image carousel
// (rendered on the fly by /api/post-image). Click an image to open/download it.
export default function PostCard({ slug, name, caption }: { slug: string; name: string; caption: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 sm:p-6">
      <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{name}</h2>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {[0, 1, 2, 3].map((i) => (
          <a
            key={i}
            href={`/api/post-image?slug=${slug}&i=${i}`}
            target="_blank"
            rel="noreferrer"
            download={`inapp-${slug}-${i + 1}.png`}
            className="shrink-0"
            title="Открыть / скачать"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/post-image?slug=${slug}&i=${i}`}
              alt={`Слайд ${i + 1}`}
              width={210}
              height={210}
              loading="lazy"
              className="size-[210px] rounded-[16px] border border-[var(--color-border-subtle)] object-cover"
            />
          </a>
        ))}
      </div>

      <textarea
        readOnly
        value={caption}
        rows={7}
        className="mt-4 w-full resize-none rounded-[14px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-3.5 text-[14px] leading-relaxed text-[var(--color-text-secondary)] outline-none"
      />

      <button
        type="button"
        onClick={copy}
        className="mt-3 rounded-full bg-[var(--color-button-primary-bg)] px-5 py-2.5 text-[14px] font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90"
      >
        {copied ? "Скопировано ✓" : "Скопировать текст"}
      </button>
    </div>
  );
}
