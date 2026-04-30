export type ListingType = "service" | "request" | "marketplace";

/**
 * Shared Listing type used across Services / Requests / Marketplace UI
 */
export interface Listing {
  id: string;
  title: string;
  description?: string | null;
  youtube_url?: string | null;
  category_id?: string | null;
  county?: string | null;
  city?: string | null;
  area?: string | null;
  price?: number | null;
  currency?: string | null;
  servicePricing?: string | null;
  serviceRate?: string | null;
  serviceAvailability?: string | null;
  requestBudget?: string | null;
  requestNeededBy?: string | null;
  requestUrgency?: string | null;
  marketplaceQuantity?: string | null;
  serviceYoutubeUrl?: string | null;
  requestYoutubeUrl?: string | null;
  marketplaceYoutubeUrl?: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  images?: string[];
  images1600?: string[];
  coverImage?: string | null;
  photoCount?: number;
  sellerType?: "private" | "business" | string | null;
  rating?: number | null;
  isFeatured?: boolean;
  savedByCurrentUser?: boolean | null;
  // optional internal fields used by backend
  status?: "draft" | "active" | "paused" | "sold" | "expired" | "archived";
  listing_type?: ListingType | string | null;
  user_id?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  allow_messages?: boolean | null;
  allow_email?: boolean | null;
  allow_phone?: boolean | null;
  show_email_publicly?: boolean | null;
  show_phone_publicly?: boolean | null;
  seller?: {
    displayName?: string | null;
    fullName?: string | null;
    name?: string | null;
    type?: "private" | "business" | string | null;
    createdAt?: string | Date | null;
    avatarUrl?: string | null;
    googlePhotoUrl?: string | null;
    isBusinessSeller?: boolean | null;
    companyName?: string | null;
    website?: string | null;
    area?: string | null;
    county?: string | null;
    ratingAverage?: number | null;
    reviewCount?: number | null;
    savedByCurrentUser?: boolean | null;
  };
}

export type ListingInsert = {
  title: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  youtubeUrl?: string | null;
  servicePricing?: string | null;
  serviceRate?: string | null;
  serviceAvailability?: string | null;
  requestBudget?: string | null;
  requestNeededBy?: string | null;
  requestUrgency?: string | null;
  marketplaceQuantity?: string | null;
  serviceYoutubeUrl?: string | null;
  requestYoutubeUrl?: string | null;
  marketplaceYoutubeUrl?: string | null;
  category_id?: string | null;
  county?: string | null;
  city?: string | null;
  area?: string | null;
  sellerType?: "private" | "business" | string | null;
  images?: string[];
  images1600?: string[];
  coverImage?: string | null;
  photoCount?: number;
  user_id?: string;
  listing_type?: ListingType | string | null;
  status?: Listing["status"] | null;
  seller?: Listing["seller"];
  contact_email?: string | null;
  contact_phone?: string | null;
  allow_messages?: boolean | null;
  allow_email?: boolean | null;
  allow_phone?: boolean | null;
  show_email_publicly?: boolean | null;
  show_phone_publicly?: boolean | null;
  rating?: number | null;
  isFeatured?: boolean;
};

export type ListingUpdate = Partial<ListingInsert> & {
  bump?: boolean;
  status?: Listing["status"];
};