"use client";

import * as React from "react";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
      <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse delay-75" />
      <div className="h-2 w-2 rounded-full bg-slate-300 animate-pulse delay-150" />
    </div>
  );
}
