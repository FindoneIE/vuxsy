"use client";

import * as React from "react";
import Link from "next/link";
import ListingDetailsPage from "@/components/listings/ListingDetailsPage";
import { useAuth } from "@/components/auth/AuthProvider";
import { runtimeLog } from "@/lib/diagnostics/runtimeLog";
import { getListingById } from "@/lib/listings/getListingById";
import type { Listing } from "@/types/listing";

type ListingDetailsLoaderProps = {
  listingId?: string;
  /**
   * Fix 4: SSR-fetched listing passed from the server page. When provided, the
   * loader seeds its state from this value so ListingGallery + SellerCardV2
   * are rendered in the initial HTML — no client-null first paint.
   */
  initialListing?: Listing | null;
};

export default function ListingDetailsLoader({
  listingId,
  initialListing = null,
}: ListingDetailsLoaderProps) {
  const { user, loading: authLoading } = useAuth();
  const authUserId = user?.id ?? null;
  const [listing, setListing] = React.useState<Listing | null>(initialListing);
  const [listingAuthUserId, setListingAuthUserId] = React.useState<string | null>(null);
  // Fix 4: if we have an SSR-seeded listing, we are not "loading" on first
  // paint. The client refetch still runs in the background to re-validate
  // status/processing state, but never blanks the visible listing.
  const [loading, setLoading] = React.useState(!initialListing && Boolean(listingId));
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const previousAuthUserIdRef = React.useRef<string | null>(null);

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

  React.useLayoutEffect(() => {
    const nextAuthUserId = authUserId;
    const previousAuthUserId = previousAuthUserIdRef.current;

    if (previousAuthUserId !== nextAuthUserId) {
      // Fix 4: do NOT blank `listing` on auth user change. The refetch effect
      // below will run with the new authUserId and update state in place once
      // fresh data arrives. Keeping the previous listing visible avoids the
      // remount-blank that previously caused gallery/seller card flicker on
      // auth refresh.
      setListingAuthUserId(nextAuthUserId);
      setProcessing(false);
      setError(null);
      // Only enter loading=true if we have nothing to show yet.
      setLoading((current) => current || (!listing && Boolean(listingId)));
    }

    previousAuthUserIdRef.current = nextAuthUserId;
  }, [listingId, authUserId, listing]);

  React.useEffect(() => {
    let mounted = true;

    runtimeLog("LISTING LOADER EFFECT", {
      listingId: listingId ?? null,
      authLoading,
      authUserId,
      reason: "effect-triggered",
    });

    async function fetchListing() {
      const fetchAuthUserId = authUserId;

      if (!listingId) {
        setListing(null);
        setListingAuthUserId(fetchAuthUserId);
        setLoading(false);
        return;
      }

      try {
        runtimeLog("LISTING LOADER FETCH START", {
          listingId: listingId ?? null,
          authLoading,
          authUserId: fetchAuthUserId,
        });
        setLoading(true);
        setProcessing(false);
        setError(null);

        const maxAttempts = 60;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          const data = await getListingById(listingId, {
            currentUserId: fetchAuthUserId,
          });
          if (!mounted) return;

          runtimeLog("PUBLIC LISTING FETCH", {
            listingId,
            authUserId: fetchAuthUserId,
            sellerProfileLoaded: Boolean(data?.seller),
            sellerPayload: data?.seller ?? null,
            sellerAvatarUrl:
              (data?.seller as { avatarUrl?: string | null; avatar_url?: string | null } | null)
                ?.avatarUrl ??
              (data?.seller as { avatar_url?: string | null } | null)?.avatar_url ??
              null,
          });

          if (!data) {
            setListing(null);
            setListingAuthUserId(fetchAuthUserId);
            setLoading(false);
            setError("This listing no longer exists (deleted)");
            return;
          }

          if (!isListingActive(data)) {
            setListing(null);
            setListingAuthUserId(fetchAuthUserId);
            setLoading(false);
            setError("This listing is not available.");
            return;
          }

          if (isListingReady(data)) {
            runtimeLog("LISTING LOADER FETCH READY", {
              listingId,
              authUserId: fetchAuthUserId,
            });
            setListing(data);
            setListingAuthUserId(fetchAuthUserId);
            setProcessing(false);
            setLoading(false);
            return;
          }

          setListing(data);
          setListingAuthUserId(fetchAuthUserId);
          setProcessing(true);
          setLoading(false);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      } catch {
        if (!mounted) return;
        runtimeLog("LISTING LOADER FETCH ERROR", {
          listingId: listingId ?? null,
          authUserId: fetchAuthUserId,
        });
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
  }, [
    listingId,
    hasProcessedImages,
    isListingActive,
    isListingReady,
    authUserId,
    authLoading,
  ]);

  if (listing && listingAuthUserId !== null && listingAuthUserId !== authUserId) {
    // Fix 4: auth user changed but refetch hasn't completed yet. Keep the
    // previously rendered listing visible instead of blanking — the refetch
    // effect will update state in place once it resolves.
    return <ListingDetailsPage listing={listing} />;
  }

  if (loading && !listing) {
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
