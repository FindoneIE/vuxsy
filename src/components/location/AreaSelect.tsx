"use client";

import * as React from "react";
import { getAreasByCounty } from "@/lib/location";

type Props = {
  county?: string | null;
  value?: string | null;
  onChange?: (value: string) => void;
  name?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
};

export default function AreaSelect({
  county,
  value,
  onChange,
  name,
  ariaLabel = "Area",
  placeholder = "All areas",
  className,
}: Props) {
  const [areas, setAreas] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (!county) {
      queueMicrotask(() => setAreas([]));
      return;
    }

    queueMicrotask(() => setLoading(true));
    // getAreasByCounty returns a Promise to allow lazy loading or future remote calls
    getAreasByCounty(county)
      .then((list) => {
        if (!mounted) return;
        setAreas(list);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [county]);

  return (
    <select
      className={className ?? "select field-select"}
      name={name}
      aria-label={ariaLabel}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={!county || loading}
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
