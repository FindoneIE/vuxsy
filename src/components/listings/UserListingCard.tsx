import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  Eye,
  MoreVertical,
  Pencil,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ListingStatusBadge, { type ListingStatus } from "@/components/listings/ListingStatusBadge";
import { cn } from "@/lib/utils";

export type UserListingCardProps = {
  id: string;
  title: string;
  type: "service" | "request" | "marketplace";
  category?: string | null;
  status: ListingStatus;
  views?: number | null;
  coverImage?: string | null;
  createdAt?: Date | string | number | null;
  updatedAt?: Date | string | number | null;
  onEdit?: (id: string) => void;
  onToggleStatus?: (id: string, nextStatus: ListingStatus) => void;
  onBump?: (id: string) => void;
  onView?: (id: string) => void;
  onMarkSold?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
};

function formatDate(value?: Date | string | number | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}

export default function UserListingCard({
  id,
  title,
  type,
  category,
  status,
  views,
  coverImage,
  createdAt,
  updatedAt,
  onEdit,
  onToggleStatus,
  onBump,
  onView,
  onMarkSold,
  onArchive,
  onDelete,
  className,
}: UserListingCardProps) {
  const createdLabel = formatDate(createdAt);
  const updatedLabel = formatDate(updatedAt);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const nextStatus = status === "active" ? "paused" : "active";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start",
        className
      )}
    >
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-36">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(min-width: 640px) 144px, 100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ListingStatusBadge status={status} />
              <span className="text-xs font-medium text-slate-500">{typeLabel}</span>
            </div>
            <h3 className="mt-2 text-base font-semibold text-slate-900">{title}</h3>
            {category && <p className="text-sm text-slate-500">{category}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEdit?.(id)}
              className="h-8 px-3"
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus?.(id, nextStatus)}
              className="h-8 px-3"
            >
              {status === "active" ? (
                <>
                  <Pause className="mr-1.5 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-4 w-4" />
                  Activate
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 px-3"
              onClick={() => onBump?.(id)}
            >
              <ArrowUpRight className="mr-1.5 h-4 w-4" />
              Bump up
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onView?.(id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View listing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMarkSold?.(id)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as sold
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive?.(id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(id)}
                  className="text-rose-600 focus:text-rose-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>{views ?? 0} views</span>
          {createdLabel && <span>Created {createdLabel}</span>}
          {updatedLabel && <span>Updated {updatedLabel}</span>}
          {onView ? (
            <button
              type="button"
              onClick={() => onView(id)}
              className="text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              View listing
            </button>
          ) : (
            <Link
              href={`/dashboard/listings/${id}/edit`}
              className="text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              Manage
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
