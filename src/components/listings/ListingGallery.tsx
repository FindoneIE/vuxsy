/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    const raw =
      images1600 && images1600.length > 0
        ? images1600
        : images && images.length > 0
        ? images
        : coverImage
        ? [coverImage]
        : [];

    return Array.from(
      new Set(
        raw.filter((value) => typeof value === "string" && value.trim().length > 0)
      )
    );
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
  const imageItems = React.useMemo(
    () =>
      items.filter(
        (item): item is Extract<GalleryItem, { type: "image" }> => item.type === "image"
      ),
    [items]
  );
  const imageItemsWithIndex = React.useMemo(
    () => imageItems.map((item, index) => ({ item, index })),
    [imageItems]
  );
  const imageCount = imageItems.length;
  const hasMultipleImages = imageCount > 1;
  const maxThumbnailSlots = 3;
  const visibleThumbnails = React.useMemo(
    () => imageItemsWithIndex.slice(0, maxThumbnailSlots),
    [imageItemsWithIndex]
  );
  const extraThumbnailCount = Math.max(imageItemsWithIndex.length - maxThumbnailSlots, 0);
  const placeholderSlots = React.useMemo(
    () => Array.from({ length: Math.max(maxThumbnailSlots - visibleThumbnails.length, 0) }),
    [maxThumbnailSlots, visibleThumbnails.length]
  );
  const [isFullscreenOpen, setIsFullscreenOpen] = React.useState(false);
  const [fullscreenIndex, setFullscreenIndex] = React.useState(0);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("fullscreen-gallery-open", isFullscreenOpen);
    return () => {
      document.body.classList.remove("fullscreen-gallery-open");
    };
  }, [isFullscreenOpen]);

  React.useEffect(() => {
    if (activeIndex >= items.length) {
      queueMicrotask(() => setActiveIndex(0));
    }
  }, [activeIndex, items.length]);

  React.useEffect(() => {
    if (fullscreenIndex >= imageItems.length) {
      queueMicrotask(() => setFullscreenIndex(0));
    }
  }, [fullscreenIndex, imageItems.length]);


  const goPrev = React.useCallback(() => {
    setActiveIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
  }, [items.length]);

  const goNext = React.useCallback(() => {
    setActiveIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
  }, [items.length]);

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

  const openFullscreenAt = React.useCallback(
    (index: number) => {
      if (!imageItems.length) return;
      const nextIndex = index >= 0 && index < imageItems.length ? index : 0;
      setFullscreenIndex(nextIndex);
      setIsFullscreenOpen(true);
    },
    [imageItems.length]
  );

  const openFullscreen = React.useCallback(() => {
    if (activeItem?.type !== "image") return;
    const nextIndex = imageItems.findIndex((item) => item.src === activeItem.src);
    openFullscreenAt(nextIndex >= 0 ? nextIndex : 0);
  }, [activeItem, imageItems, openFullscreenAt]);

  const setActiveFromThumbnail = React.useCallback(
    (index: number) => {
      if (index >= 0 && index < items.length) {
        setActiveIndex(index);
      }
    },
    [items.length]
  );

  const fullscreenPrev = React.useCallback(() => {
    setFullscreenIndex((prev) =>
      imageItems.length ? (prev - 1 + imageItems.length) % imageItems.length : 0
    );
  }, [imageItems.length]);

  const fullscreenNext = React.useCallback(() => {
    setFullscreenIndex((prev) =>
      imageItems.length ? (prev + 1) % imageItems.length : 0
    );
  }, [imageItems.length]);

  React.useEffect(() => {
    if (!isFullscreenOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreenOpen(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        fullscreenPrev();
      }
      if (event.key === "ArrowRight") {
        fullscreenNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreenNext, fullscreenPrev, isFullscreenOpen]);

  const fullscreenTouchStartX = React.useRef<number | null>(null);
  const fullscreenTouchDeltaX = React.useRef(0);

  const onFullscreenTouchStart = React.useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      fullscreenTouchStartX.current = event.touches[0]?.clientX ?? null;
      fullscreenTouchDeltaX.current = 0;
    },
    []
  );

  const onFullscreenTouchMove = React.useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (fullscreenTouchStartX.current == null) return;
      const currentX = event.touches[0]?.clientX ?? null;
      if (currentX == null) return;
      fullscreenTouchDeltaX.current = currentX - fullscreenTouchStartX.current;
    },
    []
  );

  const onFullscreenTouchEnd = React.useCallback(() => {
    if (fullscreenTouchStartX.current == null) return;
    const delta = fullscreenTouchDeltaX.current;
    fullscreenTouchStartX.current = null;
    fullscreenTouchDeltaX.current = 0;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) {
      fullscreenPrev();
    } else {
      fullscreenNext();
    }
  }, [fullscreenNext, fullscreenPrev]);

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
    <div className="listing-media-wrapper listing-media-wrapper--bleed listing-gallery-mobile-fullbleed">
      <div className="listing-media">
  <div className={`listing-media__layout ${hasMultipleImages ? "" : "is-single"}`}>
          <div
            className="listing-media__frame mobile-listing-image"
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
                className="listing-media__image cursor-zoom-in"
                priority
                onClick={openFullscreen}
              />
            )}
            {imageCount > 1 ? (
              <div className="listing-media__counter">
                {activeIndex + 1} / {imageCount}
              </div>
            ) : null}
          </div>

          {hasMultipleImages ? (
            <div className="listing-media__thumbnails" aria-label="Listing thumbnails">
              {visibleThumbnails.map(({ item, index: itemIndex }, thumbIndex) => {
                const isActive = activeIndex === itemIndex;
                const showOverlay =
                  thumbIndex === maxThumbnailSlots - 1 && extraThumbnailCount > 0;

                return (
                  <button
                    key={`thumb-${item.src}-${itemIndex}-${thumbIndex}`}
                    type="button"
                    className={`listing-media__thumb ${isActive ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveFromThumbnail(itemIndex);
                      openFullscreenAt(itemIndex);
                    }}
                    onMouseEnter={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 769) {
                        setActiveFromThumbnail(itemIndex);
                      }
                    }}
                    aria-label={`Show image ${thumbIndex + 1}`}
                  >
                    <Image
                      src={item.src}
                      alt={title ?? "Listing thumbnail"}
                      fill
                      sizes="180px"
                      className="listing-media__thumb-image"
                    />
                    {showOverlay ? (
                      <span className="listing-media__thumb-overlay">+{extraThumbnailCount}</span>
                    ) : null}
                  </button>
                );
              })}
              {placeholderSlots.map((_, placeholderIndex) => (
                <div
                  key={`placeholder-${placeholderIndex}`}
                  className="listing-media__thumb listing-media__thumb--placeholder"
                  aria-hidden
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="listing-media__thumb-icon"
                  >
                    <path
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"
                    />
                    <path
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 11l2.5 3 3.5-4.5L18 17H6l2-6z"
                    />
                  </svg>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {items.length > 1 ? (
          <div className="listing-media__dots" aria-hidden>
            {items.map((_, index) => (
              <span
                key={`dot-${index}`}
                className={`listing-media__dot ${index === activeIndex ? "is-active" : ""}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent
          showCloseButton={false}
          className="fullscreen-viewer fullscreen-gallery fullscreen-gallery-modal top-0 left-0 h-dvh w-dvw max-w-none translate-x-0 translate-y-0 rounded-none border-none p-0 text-white shadow-none ring-0 ring-transparent"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{title ?? "Listing images"}</DialogTitle>
          </DialogHeader>
          <div className="fullscreen-gallery__topbar">
            {imageItems.length > 1 ? (
              <div className="fullscreen-gallery__counter">
                {fullscreenIndex + 1}/{imageItems.length}
              </div>
            ) : null}
            <button
              type="button"
              aria-label="Close image viewer"
              onClick={() => setIsFullscreenOpen(false)}
              className="fullscreen-gallery__close"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
                <path
                  d="M6 6l12 12M18 6l-12 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div
            className="fullscreen-gallery__main"
            onTouchStart={onFullscreenTouchStart}
            onTouchMove={onFullscreenTouchMove}
            onTouchEnd={onFullscreenTouchEnd}
          >
            <div className="fullscreen-gallery-layout">
              <div className="fullscreen-main-image-area">
                <button
                  type="button"
                  aria-label="Previous image"
                  className="fullscreen-gallery__nav fullscreen-gallery__nav--prev"
                  onClick={fullscreenPrev}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
                    <path
                      d="M15 19l-6-7 6-7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {imageItems[fullscreenIndex] ? (
                  <img
                    src={imageItems[fullscreenIndex].src}
                    alt={title ?? "Listing image"}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "80vh",
                      objectFit: "contain",
                      borderRadius: "18px",
                      display: "block",
                    }}
                  />
                ) : null}
                <button
                  type="button"
                  aria-label="Next image"
                  className="fullscreen-gallery__nav fullscreen-gallery__nav--next"
                  onClick={fullscreenNext}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
                    <path
                      d="M9 5l6 7-6 7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              {imageItems.length > 1 ? (
                <div className="fullscreen-thumbnails fullscreen-gallery__thumbnails fullscreen-thumbnail-row">
                  {imageItems.map((item, index) => (
                    <button
                      key={`fullscreen-thumb-${item.src}-${index}`}
                      type="button"
                      className={`fullscreen-thumbnail ${index === fullscreenIndex ? "is-active" : ""}`}
                      onClick={() => setFullscreenIndex(index)}
                      onMouseEnter={() => setFullscreenIndex(index)}
                      aria-label={`Show image ${index + 1}`}
                    >
                      <Image
                        src={item.src}
                        alt={title ?? "Listing thumbnail"}
                        fill
                        sizes="120px"
                        className="fullscreen-thumbnail__image"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
