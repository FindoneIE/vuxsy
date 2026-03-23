import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ListingFiltersSidebar from "@/components/filters/ListingFiltersSidebar";
import ClientListings from "@/components/listings/ClientListings";

export default async function MarketplacePage() {
  const filters = <ListingFiltersSidebar mode="marketplace" />;
  const mobileFilters = <ListingFiltersSidebar mode="marketplace" variant="drawer" />;
  return (
    <ListingPageLayout title="Marketplace" filters={filters}>
      <ClientListings mode="marketplace" filters={filters} mobileFilters={mobileFilters} />
    </ListingPageLayout>
  );
}