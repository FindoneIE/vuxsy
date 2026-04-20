import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
};

export default function PageSection({ children, className, as: Component = "section" }: Props) {
  return (
    <Component className={cn("page-section", className)}>
      {children}
    </Component>
  );
}
