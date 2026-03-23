"use client";

import * as React from "react";
import { getCountiesList } from "@/lib/location";

type Props = {
  value?: string | null;
  onChange?: (value: string) => void;
  name?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
};

export default function CountySelect({
  value,
  onChange,
  name,
  ariaLabel = "County",
  placeholder = "All counties",
  className,
}: Props) {
  const counties = React.useMemo(() => getCountiesList(), []);

  return (
    <select
      className={className ?? "select field-select"}
      name={name}
      aria-label={ariaLabel}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {counties.map((c) => (
        <option key={c} value={c.toLowerCase()}>
          {c}
        </option>
      ))}
    </select>
  );
}
