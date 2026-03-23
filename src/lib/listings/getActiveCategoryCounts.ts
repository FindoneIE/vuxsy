import "server-only";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

export type ListingType = "service" | "request" | "marketplace";

export type CategoryCounts = Record<string, number>;

export async function getActiveCategoryCounts(type: ListingType): Promise<CategoryCounts> {
  const snapshot = await adminDb
    .collection("listings")
    .where("status", "==", "active")
    .where("type", "==", type)
    .select("category")
    .get();

  const counts: CategoryCounts = {};

  snapshot.forEach((doc) => {
    const data = doc.data() as { category?: string | null };
    const category = typeof data.category === "string" ? data.category : "";
    if (!category) return;
    counts[category] = (counts[category] ?? 0) + 1;
  });

  return counts;
}
