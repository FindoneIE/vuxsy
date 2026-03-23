import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { ListingType } from "@/types/listing";

export type UserListingRecord = {
  id: string;
  title?: string | null;
  type?: ListingType;
  category?: string | null;
  status?: string | null;
  views?: number | null;
  images?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type GetUserListingsParams = {
  userId: string;
  type?: ListingType;
};

export async function getUserListings({ userId, type }: GetUserListingsParams) {
  let ref = query(collection(db, "listings"), where("userId", "==", userId));

  if (type) {
    ref = query(ref, where("type", "==", type));
  }

  ref = query(ref, orderBy("updatedAt", "desc"));

  const snapshot = await getDocs(ref);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as UserListingRecord[];
}
