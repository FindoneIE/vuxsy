import ListingDetailsLoader from "@/components/listings/ListingDetailsLoader";

type PageProps = {
  params: Promise<{
    category: string;
    listingId: string;
  }>;
};

export default async function ServiceListingPage({ params }: PageProps) {
  const { listingId } = await params;
  return <ListingDetailsLoader listingId={listingId} />;
}
