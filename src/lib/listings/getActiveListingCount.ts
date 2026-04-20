import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActiveListingCountParams = {
	categoryId?: string;
	county?: string;
	area?: string;
};

function cleanString(value?: string | null): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

const isUuid = (value: string) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value
	);

export async function getActiveListingCount({
	categoryId,
	county,
	area,
}: ActiveListingCountParams): Promise<number> {
	const cleanCategory = cleanString(categoryId);
	const cleanCity = cleanString(county);
	void area;

	const supabase = await createSupabaseServerClient();
	let resolvedCategoryId = cleanCategory;

	if (cleanCategory && !isUuid(cleanCategory)) {
		const { data: category, error } = await supabase
			.from("categories")
			.select("id")
			.eq("slug", cleanCategory)
			.single();

		if (error) {
			throw error;
		}

		resolvedCategoryId = category?.id ?? undefined;
	}

	if (cleanCategory && !resolvedCategoryId) {
		return 0;
	}

	let query = supabase
		.from("listings")
		.select("id", { count: "exact", head: true });

	if (resolvedCategoryId) {
		query = query.eq("category_id", resolvedCategoryId);
	}

	if (cleanCity) {
		query = query.eq("city", cleanCity);
	}

	query = query.or("status.is.null,status.eq.active");

	const { count, error } = await query;

	if (error) {
		throw error;
	}

	return count ?? 0;
}
