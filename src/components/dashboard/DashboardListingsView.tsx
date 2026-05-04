"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardList } from "@/components/ui/Icon";
import { useAuth } from "@/components/auth/AuthProvider";
import EmptyState from "@/components/listings/EmptyState";
import UserListingCard from "@/components/listings/UserListingCard";
import UserListingActions from "@/components/listings/UserListingActions";
import UserListingSecondaryActions from "@/components/listings/UserListingSecondaryActions";
import { type ListingStatus } from "@/components/listings/ListingStatusBadge";
import { getListingHref } from "@/lib/listings/getListingHref";
import { deleteListing } from "@/lib/listings/deleteListing";
import { getUserListings } from "@/lib/listings/getUserListings";
import { updateListingStatus } from "@/lib/listings/updateListingStatus";
import { promoteListing } from "@/lib/listings/promoteListing";
import { canPromoteListing } from "@/lib/listings/promoteCooldown";
import type { ListingType } from "@/types/listing";

type Props = {
  title: string;
  type?: ListingType;
};

type DashboardListing = {
  id: string;
  title?: string | null;
  category_id?: string | null;
  city?: string | null;
  coverImage?: string | null;
  status?: ListingStatus | null;
  listing_type?: ListingType | null;
  created_at?: string | number | Date | null;
  updated_at?: string | number | Date | null;
  last_promoted_at?: string | number | Date | null;
};

const getErrorMeta = (error: { message?: string } | null) => {
  if (!error || typeof error !== "object") return {};
  const meta = error as { code?: string; details?: string; hint?: string };
  return {
    code: "code" in meta ? meta.code : undefined,
    details: "details" in meta ? meta.details : undefined,
    hint: "hint" in meta ? meta.hint : undefined,
  };
};

export default function DashboardListingsView({ title, type }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [items, setItems] = React.useState<DashboardListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const typeParam = searchParams?.get("type") ?? "all";
  const resolvedTypeFromQuery =
    typeParam === "product"
      ? "marketplace"
      : typeParam === "service"
        ? "service"
        : typeParam === "request"
          ? "request"
          : undefined;
  const resolvedType = resolvedTypeFromQuery ?? type;

  const tabs = [
    { label: "All", value: "all", href: pathname ?? "/dashboard/listings" },
    {
      label: "Products",
      value: "product",
      href: `${pathname ?? "/dashboard/listings"}?type=product`,
    },
    {
      label: "Services",
      value: "service",
      href: `${pathname ?? "/dashboard/listings"}?type=service`,
    },
    {
      label: "Requests",
      value: "request",
      href: `${pathname ?? "/dashboard/listings"}?type=request`,
    },
  ];

  const loadListings = React.useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const listings = await getUserListings({
        userId: user.id,
        listingType: resolvedType,
      });
      setItems(listings as DashboardListing[]);
    } catch (err) {
      console.error("Failed to load user listings:", err);
      setError("Could not load your listings.");
    } finally {
      setLoading(false);
    }
  }, [resolvedType, user]);

  React.useEffect(() => {
    queueMicrotask(() => {
      void loadListings();
    });
  }, [loadListings]);

  const handleEdit = (id: string) => {
    router.push(`/dashboard/listings/${id}/edit`);
  };

  const handleToggleStatus = async (id: string, nextStatus: ListingStatus) => {
    const { error: updateError } = await updateListingStatus(id, nextStatus, {
      bumpOnActivate: nextStatus === "active",
    });
    if (updateError) {
      const errorMeta = getErrorMeta(updateError);
      console.warn("Listing update failed", {
        id,
        status: nextStatus,
        message: updateError.message,
        ...errorMeta,
      });
      setError(updateError.message || "Could not update listing status.");
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );
  };

  const handleBump = async (id: string) => {
    const target = items.find((item) => item.id === id);
    if (
      target &&
      !canPromoteListing({
        createdAt: target.created_at ?? null,
        lastPromotedAt: target.last_promoted_at ?? null,
      })
    ) {
      setError("Boost available in 24h");
      return;
    }
    const resolvedType = (type ?? target?.listing_type ?? "service") as ListingType;
    const { error: updateError } = await promoteListing(id, { listingType: resolvedType });
    if (updateError) {
      const errorMeta = getErrorMeta(updateError);
      console.warn("Listing bump failed", {
        id,
        message: updateError.message,
        ...errorMeta,
      });
      setError(updateError.message || "Could not bump listing.");
      return;
    }
    await loadListings();
  };

  const handleMarkSold = async (id: string) => {
    const { error: updateError } = await updateListingStatus(id, "sold");
    if (updateError) {
      const errorMeta = getErrorMeta(updateError);
      console.warn("Listing update failed", {
        id,
        status: "sold",
        message: updateError.message,
        ...errorMeta,
      });
      setError(updateError.message || "Could not mark listing as sold.");
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "sold" } : item))
    );
  };

  const handleArchive = async (id: string) => {
    const { error: updateError } = await updateListingStatus(id, "archived");
    if (updateError) {
      const errorMeta = getErrorMeta(updateError);
      console.warn("Listing update failed", {
        id,
        status: "archived",
        message: updateError.message,
        ...errorMeta,
      });
      setError(updateError.message || "Could not archive listing.");
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "archived" } : item))
    );
  };

  const handleDelete = async (id: string) => {
    await deleteListing(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleView = (item: DashboardListing) => {
    const resolvedTypeForView = (resolvedType ?? item.listing_type ?? "service") as ListingType;
    router.push(
      getListingHref({
        id: item.id,
        type: resolvedTypeForView,
        category: item.category_id ?? undefined,
      })
    );
  };

  const typeLabel = resolvedType
    ? `${resolvedType === "marketplace" ? "products" : `${resolvedType}s`}`
    : "all listings";
  const countLabel = loading ? "Loading listings" : `${items.length} ${typeLabel}`;

  return (
    <div className="w-full max-w-none space-y-4 px-2 sm:space-y-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">Manage your listings and status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            <span className="size-2 rounded-full bg-(--color-accent)" />
            {countLabel}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            Live updates enabled
          </span>
        </div>
      </div>

  <div className="-mx-2 flex flex-nowrap gap-3 overflow-x-auto px-2 pb-1 scroll-smooth touch-pan-x">
        {tabs.map((tab) => {
          const isActive = (typeParam || "all") === tab.value;
          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={
                isActive
                  ? "inline-flex min-h-10 items-center rounded-full border border-(--brand) bg-(--brand) px-4 py-2.5 text-sm font-medium text-white!"
                  : "inline-flex min-h-10 items-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-(--brand-light) hover:text-slate-900"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {loading ? (
        <div className="min-h-32" aria-busy="true" aria-live="polite" />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="No listings yet"
          description="Create your first listing to start getting discovered."
          action={{ label: "Create listing", href: "/publish" }}
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <UserListingCard
              key={item.id}
              id={item.id}
              title={item.title ?? "Untitled listing"}
              type={(resolvedType ?? item.listing_type ?? "service") as ListingType}
              location={item.city ?? null}
              status={(item.status as ListingStatus) ?? "draft"}
              views={0}
              coverImage={item.coverImage ?? null}
              createdAt={item.created_at as Date | string | number | null}
              updatedAt={item.updated_at as Date | string | number | null}
              actions={
                <UserListingActions
                  id={item.id}
                  status={(item.status as ListingStatus) ?? "draft"}
                  createdAt={item.created_at ?? null}
                  lastPromotedAt={item.last_promoted_at ?? null}
                  onEdit={handleEdit}
                  onToggleStatus={handleToggleStatus}
                  onBump={handleBump}
                />
              }
              secondaryActions={
                <UserListingSecondaryActions
                  id={item.id}
                  type={(resolvedType ?? item.listing_type ?? "service") as ListingType}
                  status={(item.status as ListingStatus) ?? "draft"}
                  onView={() => handleView(item)}
                  onMarkSold={handleMarkSold}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
