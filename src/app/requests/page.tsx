export const revalidate = 60;

export const dynamic = "force-dynamic";

import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ListingFiltersSidebar from "@/components/filters/ListingFiltersSidebar";
import ListingsPageContent, {
  getListingsPageData,
} from "@/components/listings/StreamedListingsContent";
import type { RouteSearchParamsInput } from "@/lib/listings/searchParams";

type RequestsPageProps = {
  searchParams?: RouteSearchParamsInput;
};

// Architectural-fix: see /services/page.tsx — page awaits data BEFORE
// returning JSX so there is no async child to wrap in an implicit Suspense
// boundary.
export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[mount-trace] Route page render", {
      route: "/requests",
      file: "src/app/requests/page.tsx",
      component: "RequestsPage",
    });
  }

  const filters = <ListingFiltersSidebar mode="requests" />;
  const mobileFilters = <ListingFiltersSidebar mode="requests" variant="drawer" />;
  const data = await getListingsPageData("requests", searchParams);

  return (
    <ListingPageLayout title="Get Help" filters={filters}>
      <ListingsPageContent data={data} filters={filters} mobileFilters={mobileFilters} />
    </ListingPageLayout>
  );
}

