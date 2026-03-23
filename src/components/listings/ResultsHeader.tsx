"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES_BY_MODE } from "@/components/filters/categories";

export type ResultsHeaderMode = "services" | "requests" | "marketplace";

type ListingCountResponse = {
  count?: number;
  items?: unknown[];
};

function getDefaultLabelForMode(mode: ResultsHeaderMode) {
  if (mode === "services") return "All services";
  if (mode === "requests") return "All requests";
  if (mode === "marketplace") return "All marketplace listings";
  return "All items";
}

export default function ResultsHeader({ mode }: { mode: ResultsHeaderMode }) {
  const searchParams = useSearchParams();

  const categoryParam = searchParams?.get("category");
  const countyParam = searchParams?.get("county");

  const categories = CATEGORIES_BY_MODE[mode];

  function getCategoryLabel(slug?: string | null) {
    if (!slug) return getDefaultLabelForMode(mode);
    const found = categories.find((category) => category.id === slug);
    return found
      ? found.label
      : slug
          .split("-")
          .map((segment) => segment[0].toUpperCase() + segment.slice(1))
          .join(" ");
  }

  const categoryLabel = getCategoryLabel(categoryParam);
  const locationLabel = countyParam
    ? countyParam
        .split("-")
        .map((segment) => segment[0].toUpperCase() + segment.slice(1))
        .join(" ")
    : "Ireland";

  const [count, setCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const qs = searchParams?.toString() ?? "";

    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/${mode}${qs ? `?${qs}` : ""}`);
        if (!res.ok) {
          if (!mounted) return;
          setCount(0);
          return;
        }

        const ct = res.headers.get("content-type") || "";
        let data: ListingCountResponse | null = null;

        if (ct.includes("application/json")) {
          try {
            data = (await res.json()) as ListingCountResponse;
          } catch {
            if (!mounted) return;
            setCount(0);
            return;
          }
        } else {
          if (!mounted) return;
          setCount(0);
          return;
        }

        if (!mounted) return;
        setCount(typeof data.count === "number" ? data.count : (data.items || []).length);
      } catch {
        if (!mounted) return;
        setCount(0);
      }
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(id);
    };
  }, [searchParams, mode]);

  const noun = mode === "requests" ? "requests" : "listings";

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight leading-tight">
        {`${categoryLabel} in ${locationLabel}`}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {`${(count ?? 0).toLocaleString()} ${noun}`}
      </p>
    </div>
  );
}
