import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ListingFiltersSidebar from "@/components/filters/ListingFiltersSidebar";
import ListingsPageContent, {
  getListingsPageData,
} from "@/components/listings/StreamedListingsContent";
import type { RouteSearchParamsInput } from "@/lib/listings/searchParams";

export const dynamic = "force-dynamic";

type MarketplacePageProps = {
  searchParams?: RouteSearchParamsInput;
};

// Architectural-fix: see /services/page.tsx — page awaits data BEFORE
// returning JSX so there is no async child to wrap in an implicit Suspense
// boundary.
export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[mount-trace] Route page render", {
      route: "/marketplace",
      file: "src/app/marketplace/page.tsx",
      component: "MarketplacePage",
    });
  }

  const filters = <ListingFiltersSidebar mode="marketplace" />;
  const mobileFilters = <ListingFiltersSidebar mode="marketplace" variant="drawer" />;
  const data = await getListingsPageData("marketplace", searchParams);

  return (
    <ListingPageLayout title="Marketplace" filters={filters}>
      <ListingsPageContent data={data} filters={filters} mobileFilters={mobileFilters} />
    </ListingPageLayout>
  );
}

