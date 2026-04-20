import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export default function PageHeader({ title, subtitle, actions, className }: Props) {
  return (
    <header className={cn("page-header", className)}>
      <div className="page-header__row">
        <div>
          {title && <h1 className="page-title">{title}</h1>}
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}
