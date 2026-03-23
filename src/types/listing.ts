export type ListingType = "service" | "request" | "marketplace";

/**
 * Shared Listing type used across Services / Requests / Marketplace UI
 */
export interface Listing {
  id: string;
  type: ListingType;
  title: string;
  description?: string | null;
  category?: string | null;
  county?: string | null;
  city?: string | null;
  area?: string | null;
  price?: number | null;
  currency?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  bumpedAt?: string | Date | null;
  images?: string[];
  images1600?: string[];
  coverImage?: string | null;
  photoCount?: number;
  sellerType?: "private" | "business" | string | null;
  rating?: number | null;
  isFeatured?: boolean;
  // optional internal fields used by backend
  status?: "draft" | "active" | "paused" | "sold" | "expired" | "archived";
  userId?: string;
}