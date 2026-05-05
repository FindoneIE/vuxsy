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

const THUMB_SIZE = 112;

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
  const SLOT_COUNT = 5;
  const visibleImages = React.useMemo(
    () =>
      imageItemsWithIndex.length > SLOT_COUNT
        ? imageItemsWithIndex.slice(0, SLOT_COUNT)
        : imageItemsWithIndex,
    [imageItemsWithIndex]
  );
  const extraCount = Math.max(imageCount - SLOT_COUNT, 0);
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
    <div className="listing-media__layout">
          <div
            className="relative aspect-square w-full overflow-hidden rounded-lg"
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
                className="object-cover"
                priority
                onClick={openFullscreen}
              />
            )}
          </div>

          {hasMultipleImages ? (
            <div
              className="listing-media__thumbnails flex flex-col gap-3"
              aria-label="Listing thumbnails"
            >
              {visibleImages.map((slot, slotIndex) => {
                const { item, index: itemIndex } = slot;
                const isActive = activeIndex === itemIndex;
                const showExtraOverlay =
                  extraCount > 0 && slotIndex === SLOT_COUNT - 1;

                return (
                  <button
                    key={`thumb-${item.src}-${itemIndex}-${slotIndex}`}
                    type="button"
                    className={`listing-media__thumb relative flex-none shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 ${
                      isActive ? "is-active" : ""
                    }`}
                    style={{
                      width: THUMB_SIZE,
                      height: THUMB_SIZE,
                      minWidth: THUMB_SIZE,
                      minHeight: THUMB_SIZE,
                      maxWidth: THUMB_SIZE,
                      maxHeight: THUMB_SIZE,
                    }}
                    onClick={() => {
                      setActiveFromThumbnail(itemIndex);
                      openFullscreenAt(itemIndex);
                    }}
                    onMouseEnter={() => {
                      if (typeof window !== "undefined" && window.innerWidth >= 769) {
                        setActiveFromThumbnail(itemIndex);
                      }
                    }}
                    aria-label={`Show image ${slotIndex + 1}`}
                  >
                    <Image
                      src={item.src}
                      alt={title ?? "Listing thumbnail"}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                    {showExtraOverlay ? (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 text-sm font-semibold text-white">
                        +{extraCount}
                      </div>
                    ) : null}
                  </button>
                );
              })}
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
            className="fullscreen-gallery__content"
            onTouchStart={onFullscreenTouchStart}
            onTouchMove={onFullscreenTouchMove}
            onTouchEnd={onFullscreenTouchEnd}
          >
            <div className="fullscreen-gallery__main fullscreen-main-image-area fullscreen-gallery__image-wrapper fullscreen-gallery__image-frame w-screen max-w-none px-0 mx-0">
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
                  className="fullscreen-gallery__image fullscreen-gallery__main-image"
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
              <div className="fullscreen-gallery__thumbnails">
                {imageItems.map((item, index) => (
                  <button
                    key={`fullscreen-thumb-${item.src}-${index}`}
                    type="button"
                    className={`fullscreen-gallery__thumbnail ${
                      index === fullscreenIndex ? "fullscreen-gallery__thumbnail--active" : ""
                    }`}
                    onClick={() => setFullscreenIndex(index)}
                    onMouseEnter={() => setFullscreenIndex(index)}
                    aria-label={`Show image ${index + 1}`}
                  >
                    <Image
                      src={item.src}
                      alt={title ?? "Listing thumbnail"}
                      fill
                      sizes="88px"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
