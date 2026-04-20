import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function FormSection({ children, className }: Props) {
  return (
    <div className={cn("form-section", className)}>
      {children}
    </div>
  );
}
