import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ListingFiltersSidebar from "@/components/filters/ListingFiltersSidebar";
import ClientListings from "@/components/listings/ClientListings";
import { getPromotedListings } from "@/lib/listings/getPromotedListings";
import type { Listing } from "@/types/listing";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const filters = <ListingFiltersSidebar mode="marketplace" />;
  const mobileFilters = <ListingFiltersSidebar mode="marketplace" variant="drawer" />;
  let promotedListings: Listing[] = [];

  try {
    promotedListings = await getPromotedListings({ listingType: "marketplace" });
  } catch (error) {
    console.error("Failed to load promoted marketplace listings:", error);
  }
  return (
    <ListingPageLayout title="Marketplace" filters={filters}>
      <ClientListings
        mode="marketplace"
        filters={filters}
        mobileFilters={mobileFilters}
        promotedListings={promotedListings}
      />
    </ListingPageLayout>
  );
}