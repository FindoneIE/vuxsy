import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Listing } from "@/types/listing";

export async function getListingById(
  listingId: string
): Promise<Listing | null> {
  const ref = doc(db, "listings", listingId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Listing;
}