import "server-only";
import { adminDb } from "@/lib/firebase/firebaseAdmin";
import type { Listing } from "@/types/listing";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && value && "toDate" in value) {
    try {
      const maybeDate = (value as { toDate?: () => Date }).toDate?.();
      return maybeDate ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function getListingByIdServer(listingId: string): Promise<Listing | null> {
  if (!listingId || typeof listingId !== "string") {
    return null;
  }
  const ref = adminDb.collection("listings").doc(listingId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};

  return {
    id: snapshot.id,
    ...(data as Omit<Listing, "id">),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    bumpedAt: toDate(data.bumpedAt),
  } as Listing;
}
