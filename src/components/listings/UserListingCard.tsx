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
  mobileActions?: React.ReactNode;
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
  mobileActions,
  className,
}: UserListingCardProps) {
  const createdLabel = formatDate(createdAt);
  const updatedLabel = formatDate(updatedAt);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const dateLabel = updatedLabel ?? createdLabel;

  return (
    <div
      className={cn(
        "group rounded-xl overflow-hidden bg-white shadow-sm transition max-sm:flex max-sm:h-47.5 max-sm:flex-col max-sm:overflow-hidden sm:grid sm:h-70 sm:grid-cols-[280px_1fr]",
        className
      )}
      data-listing-id={id}
    >
  <div className="max-sm:flex max-sm:h-32.5 sm:contents">
        <div className="relative shrink-0 overflow-hidden rounded-none bg-transparent p-0 m-0 max-sm:h-32.5 max-sm:w-28 max-sm:shrink-0 sm:h-70 sm:w-70 sm:row-span-2">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={title}
              fill
              sizes="280px"
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-muted-foreground">
              <span className="text-[10px] sm:text-xs">No image</span>
            </div>
          )}
        </div>

  <div className="flex min-w-0 flex-1 flex-col max-sm:h-32.5 max-sm:min-w-0 max-sm:p-3 max-sm:relative sm:p-5 sm:col-start-2 sm:row-start-1">
          <div className="flex min-w-0 items-start justify-between gap-3 sm:block">
            <div className="min-w-0 flex-1">
              <div className="hidden items-center gap-2 sm:flex">
                <ListingStatusBadge status={status} />
                <span className="text-xs font-medium text-slate-500">{typeLabel}</span>
              </div>
              <h3 className="line-clamp-2 text-sm font-semibold text-(--text-primary) md:mb-1 md:text-base md:font-semibold sm:mb-0 sm:text-lg max-sm:line-clamp-1 max-sm:font-semibold">
                {title}
              </h3>
              {location ? (
                <div className="mt-0.5 text-sm text-(--text-primary) opacity-70 sm:mt-0 sm:text-sm max-sm:line-clamp-1">
                  {location}
                </div>
              ) : null}
              <div className="mt-1 text-xs text-(--text-primary) opacity-60 sm:hidden max-sm:line-clamp-1">
                {typeLabel}
              </div>
              {(createdLabel || updatedLabel || views != null) ? (
                <div className="mt-1 text-xs text-(--text-primary) opacity-60 sm:mt-2 sm:text-sm max-sm:truncate max-sm:whitespace-nowrap max-sm:text-xs">
                  {views != null ? `${views ?? 0} views` : null}
                  {createdLabel ? `${views != null ? " • " : ""}Created ${createdLabel}` : ""}
                  {updatedLabel ? `${(views != null || createdLabel) ? " • " : ""}Updated ${updatedLabel}` : ""}
                </div>
              ) : null}
            </div>
            <div className="flex w-24 shrink-0 flex-col items-end justify-between text-right text-sm text-(--text-primary) sm:hidden max-sm:absolute max-sm:right-3 max-sm:top-3">
              <ListingStatusBadge status={status} />
              {dateLabel ? (
                <div className="mt-1 text-xs text-(--text-primary) opacity-60 max-sm:whitespace-nowrap">{dateLabel}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

  <div className="max-sm:flex max-sm:items-center max-sm:justify-center max-sm:bg-slate-50 max-sm:border-t max-sm:border-slate-200 max-sm:px-4 max-sm:py-2 sm:col-start-2 sm:row-start-2 sm:flex sm:flex-wrap sm:items-center sm:gap-5 sm:pt-4 sm:px-5 sm:pb-5">
        <div className="w-full sm:hidden">{mobileActions}</div>
        <div className="hidden w-full items-center gap-5 sm:flex">
          {secondaryActions}
          {actions}
        </div>
      </div>
    </div>
  );
}
