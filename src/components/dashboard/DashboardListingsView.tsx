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
import { useToast } from "@/components/ui/ToastProvider";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";
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

type StatusCounts = {
  all: number;
  active: number;
  paused: number;
  archived: number;
  draft: number;
  pending: number;
  rejected: number;
};

type PendingAction =
  | "pause"
  | "resume"
  | "archive"
  | "restore"
  | "edit"
  | "continue"
  | "publish"
  | "promote";

const DEFAULT_COUNTS: StatusCounts = {
  all: 0,
  active: 0,
  paused: 0,
  archived: 0,
  draft: 0,
  pending: 0,
  rejected: 0,
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
  const { addToast } = useToast();
  const [items, setItems] = React.useState<DashboardListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusCounts, setStatusCounts] = React.useState<StatusCounts>(DEFAULT_COUNTS);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<{
    id: string;
    action: PendingAction;
  } | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const typeParam = searchParams?.get("type") ?? "all";
  const statusParam = searchParams?.get("status") ?? "all";
  const resolvedTypeFromQuery =
    typeParam === "product"
      ? "marketplace"
      : typeParam === "service"
        ? "service"
        : typeParam === "request"
          ? "request"
          : undefined;
  const resolvedType = resolvedTypeFromQuery ?? type;
  const resolvedStatusParam =
    statusParam === "active" ||
    statusParam === "paused" ||
    statusParam === "archived" ||
    statusParam === "draft" ||
    statusParam === "pending" ||
    statusParam === "rejected"
      ? statusParam
      : "all";

  const buildHref = (nextType: string, nextStatus: string) => {
    const params = new URLSearchParams();
    if (nextType !== "all") {
      params.set("type", nextType);
    }
    if (nextStatus !== "all") {
      params.set("status", nextStatus);
    }
    const base = pathname ?? "/dashboard/listings";
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  };

  const tabs = [
    { label: "All", value: "all", href: buildHref("all", resolvedStatusParam) },
    {
      label: "Products",
      value: "product",
      href: buildHref("product", resolvedStatusParam),
    },
    {
      label: "Services",
      value: "service",
      href: buildHref("service", resolvedStatusParam),
    },
    {
      label: "Requests",
      value: "request",
      href: buildHref("request", resolvedStatusParam),
    },
  ];

  const statusTabs = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Paused", value: "paused" },
    { label: "Archived", value: "archived" },
    { label: "Drafts", value: "draft" },
    { label: "Pending", value: "pending" },
    { label: "Rejected", value: "rejected" },
  ];

  type StatusCountKey = keyof StatusCounts;

  const filteredItems =
    resolvedStatusParam === "all"
      ? items
      : items.filter(
          (item) => (item.status ?? "active") === resolvedStatusParam
        );

  const loadStatusCounts = React.useCallback(async () => {
    if (!user?.id) {
      setStatusCounts(DEFAULT_COUNTS);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (resolvedType) {
        params.set("listingType", resolvedType);
      }
      const response = await fetch(
        `/api/dashboard/listing-status-counts?${params.toString()}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error("Failed to load status counts");
      }
      const data = (await response.json()) as { counts?: Partial<StatusCounts> };
      setStatusCounts({ ...DEFAULT_COUNTS, ...(data.counts ?? {}) });
    } catch (err) {
      console.error("Failed to load listing counts:", err);
    }
  }, [resolvedType, user?.id]);

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

  React.useEffect(() => {
    queueMicrotask(() => {
      void loadStatusCounts();
    });
  }, [loadStatusCounts]);

  const updateCountsForStatusChange = React.useCallback(
    (prev: StatusCounts, fromStatus: ListingStatus, toStatus?: ListingStatus | null) => {
      const next = { ...prev };
      if (fromStatus in next) {
        next[fromStatus as StatusCountKey] = Math.max(
          0,
          next[fromStatus as StatusCountKey] - 1
        );
      }
      if (toStatus) {
        if (toStatus in next) {
          next[toStatus as StatusCountKey] += 1;
        }
      } else {
        next.all = Math.max(0, next.all - 1);
      }
      return next;
    },
    []
  );

  const handleEdit = (id: string) => {
    router.push(`/dashboard/listings/${id}/edit`);
  };

  const handleToggleStatus = async (id: string, nextStatus: ListingStatus) => {
    if (pendingAction?.id === id) {
      return;
    }
    const target = items.find((item) => item.id === id);
    const previousStatus = (target?.status ?? "active") as ListingStatus;
    const previousItems = items;
    const previousCounts = statusCounts;
    const actionLabel: PendingAction =
      nextStatus === "paused"
        ? "pause"
        : nextStatus === "active" && previousStatus === "draft"
        ? "publish"
        : nextStatus === "active" && previousStatus === "paused"
        ? "resume"
        : nextStatus === "archived"
        ? "archive"
        : previousStatus === "archived" && nextStatus === "active"
        ? "restore"
        : "resume";

    setPendingAction({ id, action: actionLabel });

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );
    setStatusCounts((prev) =>
      updateCountsForStatusChange(prev, previousStatus, nextStatus)
    );

    const { error: updateError } = await updateListingStatus(id, nextStatus, {
      bumpOnActivate: nextStatus === "active",
    });
    if (updateError) {
      setItems(previousItems);
      setStatusCounts(previousCounts);
      setPendingAction(null);
      const errorMeta = getErrorMeta(updateError);
      console.warn("Listing update failed", {
        id,
        status: nextStatus,
        message: updateError.message,
        ...errorMeta,
      });
      setError(updateError.message || "Could not update listing status.");
      addToast({
        title: "Update failed",
        message: updateError.message || "Could not update listing status.",
        type: "error",
      });
      return;
    }
    setPendingAction(null);
    if (previousStatus === "active" && nextStatus === "paused") {
      addToast({ title: "Listing paused", message: "Your listing is now hidden.", type: "success" });
    } else if (previousStatus === "draft" && nextStatus === "active") {
      addToast({ title: "Listing published", message: "Your listing is now live.", type: "success" });
    } else if (previousStatus === "paused" && nextStatus === "active") {
      addToast({ title: "Listing resumed", message: "Your listing is live again.", type: "success" });
    } else if (nextStatus === "archived") {
      addToast({
        title: "Listing archived",
        message: "Your listing was archived.",
        type: "success",
      });
    } else if (previousStatus === "archived" && nextStatus === "active") {
      addToast({ title: "Listing restored", message: "Your listing is active again.", type: "success" });
    }
    void loadStatusCounts();
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


  const handleDelete = async (id: string) => {
    if (deletingId) {
      return;
    }
    const target = items.find((item) => item.id === id);
    const previousStatus = (target?.status ?? "active") as ListingStatus;
    const previousItems = items;
    const previousCounts = statusCounts;
    setDeletingId(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setStatusCounts((prev) => updateCountsForStatusChange(prev, previousStatus, null));
    try {
      await deleteListing(id);
      addToast({ title: "Listing deleted", message: "Your listing was deleted.", type: "success" });
      void loadStatusCounts();
    } catch (err) {
      console.error("Delete listing failed", err);
      setItems(previousItems);
      setStatusCounts(previousCounts);
      setError("Could not delete listing.");
      addToast({ title: "Delete failed", message: "Could not delete listing.", type: "error" });
    } finally {
      setDeletingId(null);
    }
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
  const countLabel = loading
    ? "Loading listings"
    : `${filteredItems.length} ${typeLabel}`;

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

      <div className="-mx-2 flex flex-nowrap gap-3 overflow-x-auto px-2 pb-1 scroll-smooth touch-pan-x">
        {statusTabs.map((tab) => {
          const isActive = resolvedStatusParam === tab.value;
          const count = statusCounts[tab.value as StatusCountKey] ?? 0;
          return (
            <Link
              key={tab.value}
              href={buildHref(typeParam || "all", tab.value)}
              className={
                isActive
                  ? "inline-flex items-center rounded-full bg-(--brand-light) px-3 py-1 text-sm font-medium text-(--brand)"
                  : "inline-flex items-center rounded-full border border-transparent bg-gray-100 px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
              }
            >
              {tab.label}
              <span className={isActive ? "ml-1 text-(--brand)/80" : "ml-1 text-gray-500"}>
                ({count})
              </span>
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
  ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="No listings yet"
          description="Create your first listing to start getting discovered."
          action={{ label: "Create listing", href: "/publish" }}
        />
      ) : (
        <div className="space-y-2 md:space-y-3 lg:space-y-4">
          {filteredItems.map((item) => {
            const itemStatus = (item.status as ListingStatus) ?? "draft";
            const isPendingAction = pendingAction?.id === item.id ? pendingAction.action : null;
            return (
              <UserListingCard
                key={item.id}
                id={item.id}
                title={item.title ?? "Untitled listing"}
                type={(resolvedType ?? item.listing_type ?? "service") as ListingType}
                location={item.city ?? null}
                status={itemStatus}
                views={0}
                coverImage={item.coverImage ?? null}
                createdAt={item.created_at as Date | string | number | null}
                updatedAt={item.updated_at as Date | string | number | null}
                actions={
                  <UserListingActions
                    id={item.id}
                    status={itemStatus}
                    createdAt={item.created_at ?? null}
                    lastPromotedAt={item.last_promoted_at ?? null}
                    onEdit={handleEdit}
                    onToggleStatus={handleToggleStatus}
                    onBump={handleBump}
                    pendingAction={isPendingAction}
                  />
                }
                secondaryActions={
                  <UserListingSecondaryActions
                    id={item.id}
                    status={itemStatus}
                    onView={() => handleView(item)}
                    onDelete={() => setPendingDeleteId(item.id)}
                    isDeleting={deletingId === item.id}
                  />
                }
              />
            );
          })}
        </div>
      )}
      <ConfirmActionDialog
        title="Delete listing?"
        description="This action cannot be undone. The listing will be permanently removed."
        confirmLabel="Delete listing"
        confirmLoadingLabel="Deleting..."
        confirmTone="danger"
        disabled={Boolean(deletingId)}
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
        onConfirm={async () => {
          if (!pendingDeleteId) return;
          const id = pendingDeleteId;
          setPendingDeleteId(null);
          await handleDelete(id);
        }}
      />
    </div>
  );
}
