import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
};

export default function PageActions({ children, align = "right", className }: Props) {
  return (
    <div
      className={cn(
        "page-actions",
        align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end",
        className
      )}
    >
      {children}
    </div>
  );
}
