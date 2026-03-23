import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import type { Listing } from "@/types/listing";
import { db } from "@/lib/firebase/firebase";

export type UpdateListingInput = Partial<Listing> & {
  bump?: boolean;
};

export async function updateListing(id: string, data: UpdateListingInput) {
  const ref = doc(db, "listings", id);
  const payload: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (data.bump) {
    payload.bumpedAt = serverTimestamp();
    delete payload.bump;
  }

  await updateDoc(ref, payload);
  return { id };
}
