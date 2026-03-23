import type { Listing } from "@/types/listing";

export function listingMeta(listing: Listing) {
  return { title: listing?.title || "Listing" }
}
