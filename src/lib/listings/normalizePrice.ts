type PriceLikeRecord = {
  price?: unknown;
};

const LEGACY_PRICE_KEYS = [
  "serviceRate",
  "requestBudget",
  "marketplacePrice",
  "service_rate",
  "request_budget",
  "marketplace_price",
  "rate",
  "budget",
] as const;

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numeric = Number.parseFloat(trimmed.replace(",", "."));
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

export function resolveListingPrice(record: PriceLikeRecord): number | null {
  const primary = toFiniteNumber(record.price);
  if (primary !== null) return primary;

  const source = record as Record<string, unknown>;
  for (const key of LEGACY_PRICE_KEYS) {
    const fallback = toFiniteNumber(source[key]);
    if (fallback !== null) return fallback;
  }

  return null;
}

export function withNormalizedPrice<T extends PriceLikeRecord>(record: T): T & { price: number | null } {
  return {
    ...record,
    price: resolveListingPrice(record),
  };
}
