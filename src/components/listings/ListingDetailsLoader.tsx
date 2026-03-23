"use client";

import * as React from "react";
import ListingDetailsPage from "@/components/listings/ListingDetailsPage";
import { getListingById } from "@/lib/listings/getListingById";
import type { Listing } from "@/types/listing";

type ListingDetailsLoaderProps = {
  listingId?: string;
};

export default function ListingDetailsLoader({ listingId }: ListingDetailsLoaderProps) {
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function fetchListing() {
      if (!listingId) {
        setListing(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getListingById(listingId);
        if (!mounted) return;
        setListing(data);
        setError(null);
  } catch {
        if (!mounted) return;
        setError("Failed to load listing details.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    fetchListing();

    return () => {
      mounted = false;
    };
  }, [listingId]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-muted-foreground shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-muted-foreground shadow-sm">
          Listing not found.
        </div>
      </div>
    );
  }

  return <ListingDetailsPage listing={listing} />;
}
