import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Listing } from "@/types/listing";

type CreateListingInput = Omit<
  Listing,
  "id" | "createdAt" | "updatedAt" | "bumpedAt"
>;

export async function createListing(data: CreateListingInput) {
  const coverImage =
    data.coverImage ?? (data.images && data.images.length > 0 ? data.images[0] : null);
  const collectionName = "listings";
  if (process.env.NODE_ENV === "development") {
    console.log("CREATE LISTING:", { collection: collectionName, payload: data });
  }

  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      coverImage,
      status: data.status ?? "draft",
      bumpedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (process.env.NODE_ENV === "development") {
      console.log("CREATE LISTING SUCCESS:", {
        collection: collectionName,
        id: docRef.id,
      });
    }
    return docRef.id;
  } catch (error) {
    console.error("CREATE LISTING FAILED:", {
      collection: collectionName,
      error,
    });
    throw error;
  }
}