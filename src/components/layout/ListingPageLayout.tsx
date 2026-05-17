import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  count?: number;
  actionLabel?: string;
  actionHref?: string;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function ListingPageLayout({ title, count, actionLabel, actionHref, filters, children, className }: Props) {
  return (
  <div className={cn("min-h-[calc(100vh-64px)] bg-surface/50 pt-4", className)}>
      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            {typeof count === "number" && (
              <p className="text-sm text-muted-foreground mt-1">{count} results</p>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {actionLabel && actionHref && (
              <Button asChild>
                <a href={actionHref}>{actionLabel}</a>
              </Button>
            )}
          </div>

          {/* Mobile filters button removed — filters are shown only inside the sidebar card */}
        </div>

        {/*
          Grid template MUST match the sidebar's visibility breakpoint.
          The <aside> below is `hidden lg:block`, so the 320px sidebar
          track must only be reserved at `lg:` as well. Previously the
          grid switched to `md:grid-cols-[320px_1fr]` at 768px, which
          reserved 320px (plus 32px gap) for a sidebar that was still
          hidden — making the content column on mobile landscape phones
          (~700–950px wide) narrower than mobile portrait. This is the
          exact pattern `dashboard/layout.tsx` uses (lg:flex-row), and
          why Saved Listings already renders full-width in landscape.
        */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-8">
          {filters && (
            <aside className="listing-layout__sidebar hidden lg:block w-75 xl:w-80">
              {filters}
            </aside>
          )}

          <section className="listing-layout__content min-w-0 w-full">
            <div className="space-y-3 sm:space-y-4 w-full min-w-0">
              {/* Toolbar for desktop actions */}
              <div className="hidden md:flex items-center justify-between">
                <div />
                <div>
                  {actionLabel && actionHref && (
                    <Button asChild>
                      <a href={actionHref}>{actionLabel}</a>
                    </Button>
                  )}
                </div>
              </div>

              {children}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
