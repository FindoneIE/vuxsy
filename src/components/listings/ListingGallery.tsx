"use client";

import * as React from "react";
import Image from "next/image";

type ListingGalleryProps = {
  images1600?: string[];
  images?: string[];
  coverImage?: string | null;
  title?: string;
};

export default function ListingGallery({ images1600, images, coverImage, title }: ListingGalleryProps) {
  const sources = React.useMemo(() => {
    const raw = images1600 && images1600.length > 0
      ? images1600
      : images && images.length > 0
      ? images
      : coverImage
      ? [coverImage]
      : [];

    return raw.filter((value) => typeof value === "string" && value.trim().length > 0);
  }, [images1600, images, coverImage]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeSrc = sources[activeIndex] ?? sources[0];

  if (!activeSrc) {
    return (
      <div className="flex aspect-4/3 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7v10a2 2 0 0 0 2 2h14"
              />
              <path
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v0"
              />
            </svg>
          </div>
          <span className="text-sm">No images available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 lg:space-y-4">
      <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="relative aspect-4/3 w-full">
          <Image
            src={activeSrc}
            alt={title ?? "Listing image"}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
            priority
          />
        </div>

        {sources.length > 1 ? (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white lg:right-4 lg:top-4">
            {activeIndex + 1} / {sources.length}
          </div>
        ) : null}
      </div>

      {sources.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible">
          {sources.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg border transition sm:w-auto ${
                index === activeIndex
                  ? "border-(--color-accent) ring-2 ring-(--color-accent)/30"
                  : "border-gray-200 hover:border-(--color-accent)"
              }`}
            >
              <Image src={src} alt={title ?? "Listing thumbnail"} fill className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
