import "server-only";
import { adminDb } from "@/lib/firebase/firebaseAdmin";

export type ListingType = "service" | "request" | "marketplace";

export type ActiveListingCountParams = {
	type: ListingType;
	category?: string;
	county?: string;
	area?: string;
};

function cleanString(value?: string | null): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

export async function getActiveListingCount({
	type,
	category,
	county,
	area,
}: ActiveListingCountParams): Promise<number> {
	const cleanCategory = cleanString(category);
	const cleanCounty = cleanString(county);
	const cleanArea = cleanString(area);

	let ref: FirebaseFirestore.Query = adminDb
		.collection("listings")
		.where("status", "==", "active")
		.where("type", "==", type);

	if (cleanCategory) {
		ref = ref.where("category", "==", cleanCategory);
	}

	if (cleanCounty) {
		ref = ref.where("county", "==", cleanCounty);
	}

	if (cleanArea) {
		ref = ref.where("area", "==", cleanArea);
	}

	const snapshot = await ref.count().get();
	return snapshot.data().count ?? 0;
}
