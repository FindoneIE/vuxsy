"use client";

import * as React from "react";

type Props = { online?: boolean };

export default function OnlineDot({ online }: Props) {
  return (
    <span
      className={`h-2 w-2 rounded-full ${online ? "bg-green-400" : "bg-transparent"} ring-1 ring-white`}
      aria-hidden="true"
    />
  );
}
