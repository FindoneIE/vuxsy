import ListingDetailsLoader from "@/components/listings/ListingDetailsLoader";
import { getListingByIdServer } from "@/lib/listings/getListingByIdServer";

type PageProps = {
  params: Promise<{
    category: string;
    listingId: string;
  }>;
};

export default async function ServiceListingPage({ params }: PageProps) {
  const { listingId } = await params;
  // Fix 4: SSR-fetch the listing so ListingGallery + SellerCardV2 are in the
  // initial HTML. The client loader still re-validates on mount, but seeds
  // its state from this prop so there is no client-null first paint.
  const initialListing = await getListingByIdServer(listingId);
  return <ListingDetailsLoader listingId={listingId} initialListing={initialListing} />;
}
