import * as React from "react";
import Image from "next/image";
import ListingStatusBadge, { type ListingStatus } from "@/components/listings/ListingStatusBadge";
import { cn } from "@/lib/utils";

export type UserListingCardProps = {
  id: string;
  title: string;
  type: "service" | "request" | "marketplace";
  location?: string | null;
  status: ListingStatus;
  views?: number | null;
  coverImage?: string | null;
  createdAt?: Date | string | number | null;
  updatedAt?: Date | string | number | null;
  actions?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  className?: string;
};

function formatDate(value?: Date | string | number | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UserListingCard({
  id,
  title,
  type,
  location,
  status,
  views,
  coverImage,
  createdAt,
  updatedAt,
  actions,
  secondaryActions,
  className,
}: UserListingCardProps) {
  const createdLabel = formatDate(createdAt);
  const updatedLabel = formatDate(updatedAt);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-6 hover:border-slate-300 hover:shadow-md",
        className
      )}
      data-listing-id={id}
    >
  <div className="relative w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 aspect-4/3 sm:aspect-square sm:w-40 sm:h-40">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(min-width: 640px) 160px, 100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ListingStatusBadge status={status} />
            <span className="text-xs font-medium text-slate-500">{typeLabel}</span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-slate-900 line-clamp-2">
            {title}
          </h3>
          {location ? <p className="mt-1 text-sm text-slate-500">{location}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{views ?? 0} views</span>
          {createdLabel && (
            <>
              <span aria-hidden>•</span>
              <span>Created {createdLabel}</span>
            </>
          )}
          {updatedLabel && (
            <>
              <span aria-hidden>•</span>
              <span>Updated {updatedLabel}</span>
            </>
          )}
        </div>

        {secondaryActions ? <div className="w-full">{secondaryActions}</div> : null}
      </div>

      {actions ? (
        <div className="w-full sm:w-auto sm:min-w-max sm:justify-self-end sm:self-start">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
