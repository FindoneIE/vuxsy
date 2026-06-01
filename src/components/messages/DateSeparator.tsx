"use client";

import * as React from "react";

type Props = { label: string };

export default function DateSeparator({ label }: Props) {
  return (
    <div className="flex items-center justify-center py-2">
      <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
        {label}
      </span>
    </div>
  );
}
