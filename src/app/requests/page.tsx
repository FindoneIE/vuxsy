export const revalidate = 60;

import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ListingFiltersSidebar from "@/components/filters/ListingFiltersSidebar";
import ClientListings from "@/components/listings/ClientListings";

export default async function RequestsPage() {
  const filters = <ListingFiltersSidebar mode="requests" />;
  const mobileFilters = <ListingFiltersSidebar mode="requests" variant="drawer" />;
  return (
    <ListingPageLayout title="Requests" filters={filters}>
      <ClientListings mode="requests" filters={filters} mobileFilters={mobileFilters} />
    </ListingPageLayout>
  );
}