import "server-only";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

export type ListingType = "service" | "request" | "marketplace";

export type GetListingsParams = {
  type?: ListingType;
  category?: string;
  county?: string;
  area?: string;
  pageSize?: number;
  cursor?: FirebaseFirestore.QueryDocumentSnapshot | null;
};

export type ListingRecord = {
  id: string;
  type?: ListingType;
  title?: string;
  description?: string;
  category?: string;
  categorySlug?: string;
  county?: string;
  area?: string;
  price?: number | null;
  currency?: string;
  userId?: string;
  images?: string[];
  status?: string;
  spotlightUntil?: unknown;
  bumpedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};

export type GetListingsResult = {
  items: ListingRecord[];
  nextCursor: FirebaseFirestore.QueryDocumentSnapshot | null;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function cleanString(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function getListings({
  type,
  category,
  county,
  area,
  pageSize = DEFAULT_PAGE_SIZE,
  cursor = null,
}: GetListingsParams = {}): Promise<GetListingsResult> {
  const safePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);

  const cleanCategory = cleanString(category);
  const cleanCounty = cleanString(county);
  const cleanArea = cleanString(area);

  let ref: FirebaseFirestore.Query = adminDb
    .collection("listings")
    .where("status", "==", "active");

  if (type) {
    ref = ref.where("type", "==", type);
  }

  if (cleanCategory) {
    ref = ref.where("category", "==", cleanCategory);
  }

  if (cleanCounty) {
    ref = ref.where("county", "==", cleanCounty);
  }

  if (cleanArea) {
    ref = ref.where("area", "==", cleanArea);
  }

  ref = ref.orderBy("bumpedAt", "desc").limit(safePageSize);

  if (cursor) {
    ref = ref.startAfter(cursor);
  }

  const snapshot = await ref.get();

  const items: ListingRecord[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ListingRecord[];

  const nextCursor =
    snapshot.docs.length === safePageSize
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;

  return {
    items,
    nextCursor,
  };
}