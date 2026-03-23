import ListingGallery from "@/components/listings/ListingGallery";
import ListingInfo from "@/components/listings/ListingInfo";
import type { Listing } from "@/types/listing";

type ListingDetailsPageProps = {
  listing: Listing;
};

export default function ListingDetailsPage({ listing }: ListingDetailsPageProps) {
  const title = listing.title ?? "Untitled listing";
  const locationLabel = listing.county ?? listing.city ?? "";
  const sellerLabel = listing.sellerType ?? "Seller";
  const sellerName = listing.userId ? `Seller ${listing.userId.slice(0, 6)}` : "Seller";
  const sellerInitials = sellerName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

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

            <div className="rounded-2xl border border-gray-200 bg-white p-3 lg:p-5 shadow-sm">
              <div className="space-y-2 lg:space-y-3">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                    {title}
                  </h1>
                  {listing.category ? (
                    <p className="mt-1 text-sm text-muted-foreground">{listing.category}</p>
                  ) : null}
                </div>

                <ListingInfo
                  location={locationLabel}
                  area={listing.area}
                  sellerType={listing.sellerType}
                  price={listing.price}
                  currency={listing.currency}
                  createdAt={listing.createdAt}
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
            <div className="rounded-2xl border border-gray-200 bg-white p-3 lg:p-6 shadow-sm">
              <div className="space-y-3 lg:space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {sellerInitials || "S"}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{sellerLabel}</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{sellerName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Responds via platform</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-slate-50/60 p-3 lg:p-4">
                  <div className="space-y-2 text-sm text-slate-700">
                    {locationLabel ? (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium text-slate-700">{locationLabel}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Seller type</span>
                      <span className="font-medium text-slate-700">{sellerLabel}</span>
                    </div>
                    {listing.createdAt ? (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Posted</span>
                        <span className="font-medium text-slate-700">
                          {new Date(listing.createdAt as string | number | Date).toLocaleDateString()}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <button className="btn btn--primary w-full rounded-xl">Contact seller</button>
                  <button className="btn btn--secondary w-full rounded-xl">Save listing</button>
                </div>

                <div className="border-t border-gray-100 pt-2 lg:pt-3 text-xs text-muted-foreground">
                  Secure messaging • Trusted listings
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
