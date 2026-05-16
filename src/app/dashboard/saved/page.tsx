"use client";

import * as React from "react";
import EmptyState from "@/components/listings/EmptyState";
import ListingsGrid from "@/components/listings/ListingsGrid";
import ListingsList from "@/components/listings/ListingsList";
import ListingViewToggle from "@/components/listings/ListingViewToggle";
import { Heart } from "@/components/ui/Icon";
import { useSavedListings } from "@/components/listings/SavedListingsProvider";
import { useListingViewMode } from "@/hooks/useListingViewMode";
import type { ListingCardItem } from "@/components/listings/ListingCard";

// Opt out of prerendering: transitively uses useSearchParams (via shared
// listing components). Root Suspense boundary removed (Fix 1). Auth-gated.
export const dynamic = "force-dynamic";

export default function DashboardSavedPage() {
  const { savedIds, isLoaded } = useSavedListings();
  const [items, setItems] = React.useState<ListingCardItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { mode, setMode } = useListingViewMode();

  const loadSaved = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/saved", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load saved listings");
      }

      const data = (await response.json()) as { items?: ListingCardItem[] };
      setItems(data.items ?? []);
    } catch {
      setError("Could not load saved listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    queueMicrotask(() => {
      void loadSaved();
    });
  }, [loadSaved]);

  const visibleItems = isLoaded
    ? items.filter((item) => savedIds.has(item.id))
    : items;

  return (
    <div className="space-y-6">
  <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Saved listings</h1>
        </div>
        <ListingViewToggle value={mode} onChange={setMode} />
      </div>

      {loading ? null : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          {error}
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title="No saved listings yet"
          description="Tap the heart icon on any listing to save it here."
          icon={<Heart className="h-6 w-6" />}
          action={{ label: "Browse listings", href: "/marketplace" }}
        />
      ) : mode === "list" ? (
        <ListingsList items={visibleItems} />
      ) : (
        <ListingsGrid items={visibleItems} wrap={false} />
      )}
    </div>
  );
}
