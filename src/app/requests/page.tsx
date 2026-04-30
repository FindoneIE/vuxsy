export const revalidate = 60;

export const dynamic = "force-dynamic";

import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ListingFiltersSidebar from "@/components/filters/ListingFiltersSidebar";
import ClientListings from "@/components/listings/ClientListings";
import { getPromotedListings } from "@/lib/listings/getPromotedListings";
import type { Listing } from "@/types/listing";

export default async function RequestsPage() {
  const filters = <ListingFiltersSidebar mode="requests" />;
  const mobileFilters = <ListingFiltersSidebar mode="requests" variant="drawer" />;
  let promotedListings: Listing[] = [];

  try {
    promotedListings = await getPromotedListings({ listingType: "request" });
  } catch (error) {
    console.error("Failed to load promoted request listings:", error);
  }
  return (
    <ListingPageLayout title="Get Help" filters={filters}>
      <ClientListings
        mode="requests"
        filters={filters}
        mobileFilters={mobileFilters}
        promotedListings={promotedListings}
      />
    </ListingPageLayout>
  );
}