import Image from "next/image";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import ListingsGrid from "@/components/listings/ListingsGrid";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildListingImageMap } from "@/lib/listings/listingImages";
import { resolveDisplayNameValue } from "@/lib/display-name";
import { resolveListingPrice } from "@/lib/listings/normalizePrice";
import type { ListingCardItem } from "@/components/listings/ListingCard";

type SellerAdsPageProps = {
  params: Promise<{ sellerId: string }>;
};

export default async function SellerAdsPage({ params }: SellerAdsPageProps) {
  const { sellerId } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: profile }, { data: listingRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, full_name, name, avatar_url, google_photo_url")
      .eq("id", sellerId)
      .maybeSingle(),
    supabase
      .from("listings")
      .select("*")
      .eq("user_id", sellerId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const listingIds = (listingRows ?? []).map((row) => row.id).filter(Boolean);

  const { data: imageRows } = listingIds.length
    ? await supabase
        .from("listing_images")
        .select("listing_id, image_url, storage_path_600, storage_path_1800, sort_order")
        .in("listing_id", listingIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const imageMap = buildListingImageMap(
    supabase,
    (imageRows ?? []) as {
      listing_id?: string | null;
      image_url?: string | null;
      storage_path_600?: string | null;
      storage_path_1800?: string | null;
      sort_order?: number | null;
    }[]
  );

  const sellerSnapshot = ((listingRows ?? [])[0]?.seller ?? null) as
    | {
        displayName?: string | null;
        display_name?: string | null;
        fullName?: string | null;
        full_name?: string | null;
        name?: string | null;
        avatarUrl?: string | null;
        avatar_url?: string | null;
        googlePhotoUrl?: string | null;
        google_photo_url?: string | null;
        ratingAverage?: number | null;
        rating_average?: number | null;
      }
    | null;

  const displayName =
    resolveDisplayNameValue(
      profile?.display_name,
      profile?.full_name,
      profile?.name,
      sellerSnapshot?.displayName,
      sellerSnapshot?.display_name,
      sellerSnapshot?.fullName,
      sellerSnapshot?.full_name,
      sellerSnapshot?.name
    ) ?? "User";

  const avatarUrl =
    resolveDisplayNameValue(
      profile?.avatar_url,
      profile?.google_photo_url,
      sellerSnapshot?.avatarUrl,
      sellerSnapshot?.avatar_url,
      sellerSnapshot?.googlePhotoUrl,
      sellerSnapshot?.google_photo_url
    ) ?? null;

  const ratingValue =
    typeof sellerSnapshot?.ratingAverage === "number"
      ? sellerSnapshot.ratingAverage
      : typeof sellerSnapshot?.rating_average === "number"
      ? sellerSnapshot.rating_average
      : null;

  const items: ListingCardItem[] = (listingRows ?? []).map((listing) => {
    const imageData = imageMap.get(listing.id);
    return {
      id: listing.id,
      title: listing.title,
      category_id: listing.category_id,
      county: listing.county,
      city: listing.city,
      area: listing.area,
  price: resolveListingPrice(listing as Record<string, unknown>),
      currency: listing.currency,
      created_at: listing.created_at,
      listing_type: listing.listing_type,
      coverImage: imageData?.coverImage ?? null,
      images: imageData?.images ?? [],
      images1600: imageData?.images1600 ?? [],
      photoCount: imageData?.photoCount ?? 0,
    };
  });

  return (
    <PageContainer className="pt-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="56px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-500">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-slate-900 md:text-2xl">
                {displayName}
              </h1>
              <p className="text-sm text-slate-500">
                {items.length} active {items.length === 1 ? "ad" : "ads"}
                {typeof ratingValue === "number" && Number.isFinite(ratingValue)
                  ? ` • ⭐ ${ratingValue.toFixed(1)}`
                  : ""}
              </p>
            </div>
          </div>
          <Link
            href="/services"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Browse all listings
          </Link>
        </div>

        <ListingsGrid
          items={items}
          wrap={false}
          className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        />
      </div>
    </PageContainer>
  );
}
