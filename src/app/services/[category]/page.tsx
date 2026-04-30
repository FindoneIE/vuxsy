import { getListings } from "@/lib/listings/getListings";
import ListingCard from "@/components/listings/ListingCard";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const result = await getListings({
    categoryId: category,
    pageSize: 20,
    listingType: "service",
  });

  return (
    <main className="py-6 sm:py-8">
      <h1>Services</h1>

      {result.items.length === 0 ? (
        <p>No services found.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {result.items.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </main>
  );
}