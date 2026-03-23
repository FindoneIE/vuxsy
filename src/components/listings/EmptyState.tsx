import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    href: string;
  };
};

export default function EmptyState({
  title = "No results",
  description = "Try adjusting filters or check back later.",
  icon,
  action,
}: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
      {icon ? (
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {action ? (
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
