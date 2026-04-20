import ListingGallery from "@/components/listings/ListingGallery";
import ListingInfo from "@/components/listings/ListingInfo";
import SellerCardV2 from "@/components/listings/SellerCardV2";
import type { Listing } from "@/types/listing";

type ListingDetailsPageProps = {
  listing: Listing;
};

export default function ListingDetailsPage({ listing }: ListingDetailsPageProps) {
  const title = listing.title ?? "Untitled listing";
  const locationLabel = listing.county ?? listing.city ?? "";
  const categoryLabel = (listing as Listing & { category?: string | null }).category;
  const createdAt = listing.created_at ?? null;

  return (
    <div className="bg-slate-50/40">
      <div className="py-4 lg:py-10">
        <div className="grid grid-cols-1 gap-3 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3 lg:space-y-6">
            <ListingGallery
              images1600={listing.images1600}
              images={listing.images}
              coverImage={listing.coverImage ?? null}
              title={title}
            />

            <div className="listing-media rounded-2xl border border-gray-200 bg-white p-3 lg:p-5 shadow-sm">
              <div className="space-y-2 lg:space-y-3">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                    {title}
                  </h1>
                  {categoryLabel ? (
                    <p className="mt-1 text-sm text-muted-foreground">{categoryLabel}</p>
                  ) : null}
                </div>

                <ListingInfo
                  location={locationLabel}
                  sellerType={listing.sellerType}
                  price={listing.price}
                  currency={listing.currency}
                  createdAt={createdAt}
                />

                {listing.description ? (
                  <div className="pt-2 lg:pt-3 text-sm leading-6 text-slate-700 md:text-base">
                    {listing.description}
                  </div>
                ) : (
                  <div className="pt-2 lg:pt-3 text-sm text-muted-foreground">
                    Description coming soon.
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--site-header-height)+24px)]">
            <SellerCardV2
              seller={listing.seller}
              createdAt={createdAt}
              contactPhone={listing.contact_phone ?? null}
              contactEmail={listing.contact_email ?? null}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
