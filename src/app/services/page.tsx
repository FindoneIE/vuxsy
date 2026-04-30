import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ListingFiltersSidebar from "@/components/filters/ListingFiltersSidebar";
import ClientListings from "@/components/listings/ClientListings";
import { getPromotedListings } from "@/lib/listings/getPromotedListings";
import type { Listing } from "@/types/listing";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const filters = <ListingFiltersSidebar />;
  const mobileFilters = <ListingFiltersSidebar variant="drawer" />;
  let promotedListings: Listing[] = [];

  try {
    promotedListings = await getPromotedListings({ listingType: "service" });
  } catch (error) {
    console.error("Failed to load promoted service listings:", error);
  }
  return (
    <ListingPageLayout title="Services" filters={filters}>
      <ClientListings
        mode="services"
        filters={filters}
        mobileFilters={mobileFilters}
        promotedListings={promotedListings}
      />
    </ListingPageLayout>
  );
}