"use client";

import * as React from "react";
import Image from "next/image";

type ListingGalleryProps = {
  images1600?: string[];
  images?: string[];
  coverImage?: string | null;
  youtubeUrl?: string | null;
  title?: string;
};

type GalleryItem =
  | { type: "image"; src: string }
  | { type: "video"; id: string; thumbnail: string };

const extractYouTubeId = (value?: string | null) => {
  const url = value?.trim();
  if (!url) return null;
  const shortMatch = url.match(/youtu\.be\/([\w-]{6,})/i);
  if (shortMatch?.[1]) return shortMatch[1];
  const longMatch = url.match(/[?&]v=([\w-]{6,})/i);
  if (longMatch?.[1]) return longMatch[1];
  const embedMatch = url.match(/youtube\.com\/embed\/([\w-]{6,})/i);
  if (embedMatch?.[1]) return embedMatch[1];
  return null;
};

export default function ListingGallery({
  images1600,
  images,
  coverImage,
  youtubeUrl,
  title,
}: ListingGalleryProps) {
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

  const youtubeId = React.useMemo(() => extractYouTubeId(youtubeUrl), [youtubeUrl]);

  const items = React.useMemo<GalleryItem[]>(() => {
    const imageItems = sources.map((src) => ({ type: "image" as const, src }));
    if (!youtubeId) return imageItems;
    return [
      {
        type: "video",
        id: youtubeId,
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      },
      ...imageItems,
    ];
  }, [sources, youtubeId]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeItem = items[activeIndex] ?? items[0];

  const [canHover, setCanHover] = React.useState(false);

  React.useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, items.length]);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateHover = () => setCanHover(mediaQuery.matches);

    updateHover();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateHover);
      return () => mediaQuery.removeEventListener("change", updateHover);
    }

    mediaQuery.addListener(updateHover);
    return () => mediaQuery.removeListener(updateHover);
  }, []);

  const goPrev = React.useCallback(() => {
    setActiveIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
  }, [items.length]);

  const goNext = React.useCallback(() => {
    setActiveIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
  }, [items.length]);

  const handleThumbnailHover = React.useCallback((index: number) => {
    if (!canHover) return;
    setActiveIndex(index);
  }, [canHover]);

  const touchStartX = React.useRef<number | null>(null);
  const touchDeltaX = React.useRef(0);

  const onTouchStart = React.useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  }, []);

  const onTouchMove = React.useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current == null) return;
    const currentX = event.touches[0]?.clientX ?? null;
    if (currentX == null) return;
    touchDeltaX.current = currentX - touchStartX.current;
  }, []);

  const onTouchEnd = React.useCallback(() => {
    if (touchStartX.current == null) return;
    const delta = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      goPrev();
    } else {
      goNext();
    }
  }, [goNext, goPrev]);

  if (!activeItem) {
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
    <div className="listing-media-wrapper">
      <div className="listing-media">
        <div
          className="listing-media__frame"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {activeItem.type === "video" ? (
            <iframe
              src={`https://www.youtube.com/embed/${activeItem.id}`}
              title={title ?? "Listing video"}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <Image
              src={activeItem.src}
              alt={title ?? "Listing image"}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-contain"
              priority
            />
          )}
          {items.length > 1 ? (
            <div className="listing-media__counter">
              {activeIndex + 1} / {items.length}
            </div>
          ) : null}

          {items.length > 1 ? (
            <div className="listing-media__nav">
              <button type="button" className="listing-media__nav-btn" onClick={goPrev} aria-label="Previous image">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M12.5 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className="listing-media__nav-btn" onClick={goNext} aria-label="Next image">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>

        {items.length > 1 ? (
          <div className="listing-media__thumbnails">
            {items.map((item, index) => (
              <button
                key={`${item.type}-${item.type === "image" ? item.src : item.id}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                onMouseEnter={canHover ? () => handleThumbnailHover(index) : undefined}
                className={`listing-media__thumb relative ${index === activeIndex ? "is-active" : ""}`}
              >
                {item.type === "video" ? (
                  <Image
                    src={item.thumbnail}
                    alt="Video thumbnail"
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                ) : (
                  <Image
                    src={item.src}
                    alt={title ?? "Listing thumbnail"}
                    fill
                    className="object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        ) : null}

        {items.length > 1 ? (
          <div className="listing-media__dots" aria-hidden>
            {items.map((_, index) => (
              <span key={`dot-${index}`} className={`listing-media__dot ${index === activeIndex ? "is-active" : ""}`} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
