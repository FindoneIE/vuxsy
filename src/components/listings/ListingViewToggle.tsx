import * as React from "react";
import { LayoutGrid, List } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type ListingViewMode = "grid" | "list";

type Props = {
  value: ListingViewMode;
  onChange: (value: ListingViewMode) => void;
  className?: string;
};

export default function ListingViewToggle({ value, onChange, className }: Props) {
  return (
    <div className={cn("listing-view-toggle", className)}>
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={cn(
          "listing-view-toggle__button",
          value === "grid" && "is-active"
        )}
        aria-pressed={value === "grid"}
        aria-label="Grid view"
      >
    <LayoutGrid size={24} weight="regular" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "listing-view-toggle__button",
          value === "list" && "is-active"
        )}
        aria-pressed={value === "list"}
        aria-label="List view"
      >
    <List size={24} weight="regular" />
      </button>
    </div>
  );
}
