import ListingGallery from "@/components/listings/ListingGallery";
import ListingInfo from "@/components/listings/ListingInfo";
import SellerCardV2 from "@/components/listings/SellerCardV2";
import SavedListingButton from "@/components/listings/SavedListingButton";
import ReportListingButton from "@/components/listings/ReportListingButton";
import ShareListingPopover from "@/components/listings/ShareListingPopover";
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
  <div className="listing-detail-page">
      <div className="pb-4 lg:py-10">
        <div className="grid grid-cols-1 gap-3 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3 lg:space-y-6">
            <div className="listing-detail-gallery">
              <ListingGallery
                images1600={listing.images1600}
                images={listing.images}
                coverImage={listing.coverImage ?? null}
                title={title}
              />
            </div>

            <div className="listing-media listing-detail-card">
              <div className="space-y-2 lg:space-y-3 listing-detail-card-inner">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-semibold">
                      {title}
                    </h1>
                    {categoryLabel ? (
                      <p className="mt-1 text-sm text-gray-500">{categoryLabel}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 -mt-2 text-gray-400">
                    <ShareListingPopover
                      title={title}
                      triggerClassName="text-gray-400 hover:text-gray-700"
                    />
                    <SavedListingButton
                      listingId={listing.id}
                      initialSaved={listing.savedByCurrentUser}
                      title="Save"
                      className="text-gray-400 hover:text-gray-700"
                      withBackground={false}
                    />
                    <ReportListingButton
                      listingId={listing.id}
                      sellerId={listing.user_id ?? null}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <ListingInfo
                  listingId={listing.id}
                  sellerId={listing.user_id ?? null}
                  location={locationLabel}
                  sellerType={listing.sellerType}
                  price={listing.price}
                  currency={listing.currency}
                  createdAt={createdAt}
                  savedByCurrentUser={listing.savedByCurrentUser}
                />

                <div className="mt-4">
                  <div className="max-w-(--media-max-width)">
                    {listing.description ? (
                      <p className="text-sm text-gray-700 leading-relaxed listing-description-card">
                        {listing.description}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 leading-relaxed listing-description-card">
                        Description coming soon.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-[calc(var(--site-header-height)+24px)] listing-seller-card">
            <SellerCardV2
              seller={listing.seller}
              sellerType={listing.sellerType}
              createdAt={createdAt}
              contactPhone={listing.contact_phone ?? null}
              contactEmail={listing.contact_email ?? null}
              listingId={listing.id}
              sellerId={listing.user_id ?? null}
              allowMessages={listing.allow_messages ?? null}
              allowPhone={listing.allow_phone ?? null}
              allowEmail={listing.allow_email ?? null}
              showPhonePublicly={listing.show_phone_publicly ?? null}
              showEmailPublicly={listing.show_email_publicly ?? null}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
