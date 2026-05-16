import ListingPageLayout from "@/components/layout/ListingPageLayout";
import ListingFiltersSidebar from "@/components/filters/ListingFiltersSidebar";
import ListingsPageContent, {
  getListingsPageData,
} from "@/components/listings/StreamedListingsContent";
import type { RouteSearchParamsInput } from "@/lib/listings/searchParams";

export const dynamic = "force-dynamic";

type ServicesPageProps = {
  searchParams?: RouteSearchParamsInput;
};

// Architectural-fix: the page is async and awaits all data BEFORE returning
// JSX. The returned tree contains no async children, so Next.js cannot wrap
// any child in an implicit Suspense boundary — the entire page HTML is
// flushed in one chunk with cards already present at DCL (no `<template
// id="B:0">`/`<div hidden id="S:0">`/`$RC` reveal).
export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[mount-trace] Route page render", {
      route: "/services",
      file: "src/app/services/page.tsx",
      component: "ServicesPage",
    });
  }

  const filters = <ListingFiltersSidebar />;
  const mobileFilters = <ListingFiltersSidebar variant="drawer" />;
  const data = await getListingsPageData("services", searchParams);

  return (
    <ListingPageLayout title="Services" filters={filters}>
      <ListingsPageContent data={data} filters={filters} mobileFilters={mobileFilters} />
    </ListingPageLayout>
  );
}

