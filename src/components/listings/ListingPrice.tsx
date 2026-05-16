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
    <span
      className={cn(
        "inline-flex items-center gap-1 leading-none text-gray-900",
        className
      )}
    >
      <span className="text-base font-medium text-gray-500 sm:text-lg">
        {currency ?? "€"}
      </span>
      <span className="text-2xl font-semibold tabular-nums sm:text-[28px]">
        {normalizedPrice}
      </span>
    </span>
  );
}
