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
  if (mode === "requests") return "All jobs";
  if (mode === "marketplace") return "All marketplace listings";
  return "All items";
}

type ResultsHeaderProps = {
  mode: ResultsHeaderMode;
  count?: number | null;
};

let resultsHeaderRenderCount = 0;

export default function ResultsHeader({ mode, count: countProp }: ResultsHeaderProps) {
  const DEV = process.env.NODE_ENV !== "production";
  const renderCount = ++resultsHeaderRenderCount;

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

  const [count, setCount] = React.useState<number | null>(
    typeof countProp === "number" ? countProp : null
  );

  React.useEffect(() => {
    if (typeof countProp === "number") {
      return;
    }
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
  }, [searchParams, mode, countProp]);

  const noun = mode === "requests" ? "jobs" : "listings";
  const resolvedCount = typeof countProp === "number" ? countProp : count ?? 0;

  if (DEV) {
    console.debug("[mount-trace] ResultsHeader render", {
      mode,
  renderCount,
      categoryParam,
      countyParam,
      countProp,
      stateCount: count,
      resolvedCount,
    });
    if (typeof performance !== "undefined") {
      performance.mark(`ResultsHeader:render:${renderCount}`);
    }
  }

  React.useEffect(() => {
    if (!DEV) return;
    console.debug("[mount-trace] ResultsHeader mount", {
      mode,
      countProp,
      stateCount: count,
    });
    return () => {
      console.debug("[mount-trace] ResultsHeader unmount", { mode });
    };
  }, [DEV, count, countProp, mode]);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight leading-tight">
        {`${categoryLabel} in ${locationLabel}`}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {`${resolvedCount.toLocaleString()} ${noun}`}
      </p>
    </div>
  );
}
