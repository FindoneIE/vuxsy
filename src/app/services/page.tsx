import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ListingFiltersSidebar from "@/components/filters/ListingFiltersSidebar";
import ClientListings from "@/components/listings/ClientListings";

export default async function ServicesPage() {
  const filters = <ListingFiltersSidebar />;
  const mobileFilters = <ListingFiltersSidebar variant="drawer" />;
  return (
    <ListingPageLayout title="Services" filters={filters}>
      <ClientListings mode="services" filters={filters} mobileFilters={mobileFilters} />
    </ListingPageLayout>
  );
}