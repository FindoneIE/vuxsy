import type React from "react";
import { getListings } from "@/lib/listings/getListings";
import type { ListingType } from "@/types/listing";
import ListingsGrid from "@/components/listings/ListingsGrid";
import EmptyState from "@/components/listings/EmptyState";

type ListingsPageProps = {
  type: ListingType;
  title: string;
  emptyText: string;
};

export default async function ListingsPage({
  type,
  title,
  emptyText,
}: ListingsPageProps) {
  let result: Awaited<ReturnType<typeof getListings>> | null = null;
  let hasError = false;

  try {
    result = await getListings({
      pageSize: 20,
    });
  } catch (error) {
    console.error(`Failed to load ${type} listings:`, error);
    hasError = true;
  }

  if (hasError || !result) {
    return (
      <main className="py-6 sm:py-8">
        <h1>{title}</h1>
        <p>Failed to load listings.</p>
      </main>
    );
  }

  return (
    <main className="py-6 sm:py-8">
      <h1>{title}</h1>

      {result.items.length === 0 ? (
        <EmptyState title="No listings" description={emptyText} />
      ) : (
        <ListingsGrid
          items={result.items}
          className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        />
      )}
    </main>
  );
}