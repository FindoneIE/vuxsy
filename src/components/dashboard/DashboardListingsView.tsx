"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import EmptyState from "@/components/listings/EmptyState";
import UserListingCard from "@/components/listings/UserListingCard";
import { type ListingStatus } from "@/components/listings/ListingStatusBadge";
import { getListingHref } from "@/lib/listings/getListingHref";
import { deleteListing } from "@/lib/listings/deleteListing";
import { getUserListings } from "@/lib/listings/getUserListings";
import { updateListing } from "@/lib/listings/updateListing";
import type { ListingType } from "@/types/listing";

type Props = {
  title: string;
  type?: ListingType;
};

type DashboardListing = {
  id: string;
  title?: string | null;
  type?: ListingType;
  category?: string | null;
  status?: ListingStatus | null;
  views?: number | null;
  images?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export default function DashboardListingsView({ title, type }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = React.useState<DashboardListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadListings = React.useCallback(async () => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const listings = await getUserListings({ userId: user.uid, type });
      setItems(listings as DashboardListing[]);
    } catch (err) {
      console.error("Failed to load user listings:", err);
      setError("Could not load your listings.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, type]);

  React.useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleEdit = (id: string) => {
    router.push(`/dashboard/listings/${id}/edit`);
  };

  const handleToggleStatus = async (id: string, nextStatus: ListingStatus) => {
    await updateListing(id, { status: nextStatus });
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );
  };

  const handleBump = async (id: string) => {
    await updateListing(id, { bump: true });
    await loadListings();
  };

  const handleMarkSold = async (id: string) => {
    await updateListing(id, { status: "sold" });
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "sold" } : item))
    );
  };

  const handleArchive = async (id: string) => {
    await updateListing(id, { status: "archived" });
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "archived" } : item))
    );
  };

  const handleDelete = async (id: string) => {
    await deleteListing(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleView = (item: DashboardListing) => {
    router.push(
      getListingHref({
        id: item.id,
        type: item.type ?? "service",
        category: item.category ?? undefined,
      })
    );
  };

  const typeLabel = type
    ? `${type === "marketplace" ? "marketplace" : type}s`
    : "all listings";
  const countLabel = loading ? "Loading listings" : `${items.length} ${typeLabel}`;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
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

      {loading ? (
        <div className="space-y-3">
          <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200/70" />
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
          <div className="h-28 animate-pulse rounded-2xl bg-white" />
        </div>
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
              type={item.type ?? "service"}
              category={item.category}
              status={(item.status as ListingStatus) ?? "draft"}
              views={item.views ?? 0}
              coverImage={item.images?.[0]}
              createdAt={item.createdAt as Date | string | number | null}
              updatedAt={item.updatedAt as Date | string | number | null}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onBump={handleBump}
              onView={() => handleView(item)}
              onMarkSold={handleMarkSold}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
