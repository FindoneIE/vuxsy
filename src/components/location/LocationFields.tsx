"use client";

import * as React from "react";
import CountySelect from "@/components/location/CountySelect";
import AreaSelect from "@/components/location/AreaSelect";

type Props = {
  county?: string | null;
  area?: string | null;
  onCountyChange?: (v: string) => void;
  onAreaChange?: (v: string) => void;
};

export default function LocationFields({ county, area, onCountyChange, onAreaChange }: Props) {
  return (
    <div className="filters-sidebar__location">
      <CountySelect value={county ?? ""} onChange={(v) => onCountyChange?.(v)} ariaLabel="County" />
      <AreaSelect county={county ?? undefined} value={area ?? ""} onChange={(v) => onAreaChange?.(v)} ariaLabel="Area" />
    </div>
  );
}
