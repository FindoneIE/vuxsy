import * as React from "react";
import { cn } from "@/lib/utils";

type ListingPriceProps = {
  price?: number | null;
  currency?: string | null;
  className?: string;
  emptyClassName?: string;
};

export default function ListingPrice({
  price,
  currency,
  className,
  emptyClassName,
}: ListingPriceProps) {
  const normalizedPrice =
    typeof price === "number" && Number.isFinite(price) ? price : null;

  if (normalizedPrice == null) {
    return <div className={cn("mt-2 text-sm text-muted-foreground", emptyClassName)}>—</div>;
  }

  return (
    <div className={cn("mt-3 flex items-end gap-1", className)}>
      <span className="text-gray-500 text-xl">{currency ?? "€"}</span>
      <span className="text-4xl font-bold text-gray-900">{normalizedPrice}</span>
    </div>
  );
}
