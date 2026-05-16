"use client";

import * as React from "react";
import { getAreasByCountySync } from "@/lib/location";

type Props = {
  county?: string | null;
  value?: string | null;
  onChange?: (value: string) => void;
  name?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
};

// Synchronous list lookup via useMemo. The previous implementation kept areas
// in state and populated them in a useEffect via an "async" call (whose
// underlying lookup was already synchronous). Consequence: on first paint
// the `<select>` had only the placeholder `<option>`, so the controlled
// `value` (e.g. the user's saved area) had no matching option — the dropdown
// showed the placeholder text, then "swapped" to the real area name once
// the effect resolved on the next render. That was the remaining dropdown
// text repaint reported on /dashboard/settings.
export default function AreaSelect({
  county,
  value,
  onChange,
  name,
  ariaLabel = "Area",
  placeholder = "All areas",
  className,
}: Props) {
  const areas = React.useMemo(
    () => (county ? getAreasByCountySync(county) : []),
    [county],
  );

  return (
    <select
      className={className ?? "select field-select"}
      name={name}
      aria-label={ariaLabel}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={!county}
    >
      <option value="">{placeholder}</option>
      {areas.map((a) => (
        <option key={a} value={a.toLowerCase()}>
          {a}
        </option>
      ))}
    </select>
  );
}
