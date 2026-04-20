import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
};

export default function ContentGrid({ children, cols = 1, className }: Props) {
  const colsClass = cols === 1 ? "" : cols === 2 ? "cols-2" : "cols-3";
  return <div className={cn("content-grid", colsClass, className)}>{children}</div>;
}
