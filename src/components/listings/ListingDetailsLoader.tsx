"use client";

import * as React from "react";
import Link from "next/link";
import ListingDetailsPage from "@/components/listings/ListingDetailsPage";
import { getListingById } from "@/lib/listings/getListingById";
import type { Listing } from "@/types/listing";

type ListingDetailsLoaderProps = {
  listingId?: string;
};

export default function ListingDetailsLoader({ listingId }: ListingDetailsLoaderProps) {
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const hasProcessedImages = React.useCallback((nextListing: Listing | null) => {
    if (!nextListing) return false;
    const images = [
      ...(nextListing.images1600 ?? []),
      ...(nextListing.images ?? []),
    ];
    return images.some((url) => typeof url === "string" && url.includes(".webp"));
  }, []);

  const isListingActive = React.useCallback((nextListing: Listing | null) => {
    if (!nextListing) return false;
    return nextListing.status === "active";
  }, []);

  const isListingReady = React.useCallback(
    (nextListing: Listing | null) =>
      isListingActive(nextListing) && hasProcessedImages(nextListing),
    [hasProcessedImages, isListingActive]
  );

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
        setProcessing(false);
        setError(null);

        const maxAttempts = 60;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const data = await getListingById(listingId);
          if (!mounted) return;

          if (!data) {
            setListing(null);
            setLoading(false);
            setError("This listing no longer exists (deleted)");
            return;
          }

          if (!isListingActive(data)) {
            setListing(null);
            setLoading(false);
            setError("This listing is not available.");
            return;
          }

          if (isListingReady(data)) {
            setListing(data);
            setProcessing(false);
            setLoading(false);
            return;
          }

          setListing(data);
          setProcessing(true);
          setLoading(false);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
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
  }, [listingId, hasProcessedImages, isListingActive, isListingReady]);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-muted-foreground shadow-sm">
          <p>{error}</p>
          <div className="mt-4">
            <Link
              href="/marketplace"
              className="inline-flex h-9 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700"
            >
              Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-muted-foreground shadow-sm">
          Images are still processing. Your listing will appear automatically once the photos are ready.
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-muted-foreground shadow-sm">
          <p>This listing no longer exists (deleted)</p>
          <div className="mt-4">
            <Link
              href="/marketplace"
              className="inline-flex h-9 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700"
            >
              Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ListingDetailsPage listing={listing} />;
}
