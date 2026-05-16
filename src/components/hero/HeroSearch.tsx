"use client";

import * as React from "react";
import CountySelect from "@/components/location/CountySelect";
import AreaSelect from "@/components/location/AreaSelect";
import { CATEGORIES_BY_MODE } from "@/components/filters/categories";
import { useQuickSearch, type QuickSearchTab } from "@/hooks/useQuickSearch";
import { Search, Wrench, Handshake, Store } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Mode = "services" | "help" | "market";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconCmp = React.ComponentType<any>;

const TABS: Array<{
  id: Mode;
  label: string;
  short: string;
  href: QuickSearchTab;
  icon: IconCmp;
}> = [
  { id: "services", label: "Services", short: "Services", href: "/services", icon: Wrench },
  { id: "help", label: "Get help", short: "Get help", href: "/requests", icon: Handshake },
  { id: "market", label: "Marketplace", short: "Marketplace", href: "/marketplace", icon: Store },
];

export default function HeroSearch() {
  const [mode, setMode] = React.useState<Mode>("services");
  const {
    q,
    setQ,
    category,
    setCategory,
    county,
    setCounty,
    area,
    setArea,
    selectTab,
    isLoading,
    listingCount,
    hasCategorySelection,
    onSearch,
  } = useQuickSearch({ syncWithHeroTabs: false });

  const tabLabel = mode === "help" ? "requests" : mode === "market" ? "marketplace" : "services";
  const placeholder =
    mode === "services"
      ? "Search services, e.g. plumber, lawn care"
      : mode === "help"
      ? "Describe what you need help with"
      : "Search marketplace listings";
  const buttonText =
    mode === "services" ? "Search services" : mode === "help" ? "Post request" : "Search marketplace";
  const categories = CATEGORIES_BY_MODE[tabLabel];
  const submitDisabled = isLoading || (hasCategorySelection && listingCount === 0);

  return (
    <form
      onSubmit={onSearch}
      className="relative isolate rounded-3xl bg-white/95 p-3 shadow-[0_24px_60px_-30px_rgba(31,42,68,0.45)] ring-1 ring-slate-200/70 backdrop-blur supports-backdrop-filter:bg-white/85 sm:p-4"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -top-6 -z-10 h-32 rounded-[36px] bg-linear-to-br from-[rgba(52,87,155,0.18)] via-[rgba(52,87,155,0.05)] to-transparent blur-2xl"
      />

      {/* Tabs — 3 equal columns, each tab width = one dropdown column width */}
      <div className="relative grid grid-cols-3 gap-2">
        {TABS.map((tab) => {
          const isActive = mode === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id);
                selectTab(tab.href);
              }}
              className={cn(
                "group inline-flex h-12 w-full items-center justify-center gap-1 rounded-2xl px-1.5 text-[12px] font-medium transition sm:gap-1.5 sm:px-3 sm:text-sm",
                isActive
                  ? "bg-(--color-primary) text-white shadow-[0_6px_16px_-8px_rgba(52,87,155,0.55)]"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              )}
              aria-pressed={isActive}
            >
              <Icon
                weight="regular"
                className={cn(
                  "hidden h-4 w-4 shrink-0 transition sm:block",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main search row — flex row: input + separate 48x48 button, 8px gap */}
      <div className="mt-3 flex h-12 w-full items-center gap-2">
        <input
          className="box-border block h-12 min-w-0 flex-1 appearance-none rounded-2xl border-0 bg-slate-50 px-3 py-0 text-[15px] leading-none text-slate-900 placeholder:text-slate-400 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[rgba(52,87,155,0.2)] sm:text-base"
          name="q"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitDisabled}
          aria-busy={isLoading}
          aria-label={buttonText}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-0 bg-(--color-primary) p-0 text-white transition hover:bg-(--color-primary-hover) disabled:opacity-60"
        >
          {isLoading ? (
            <span className="spinner" aria-hidden />
          ) : (
            <Search weight="bold" size={28} color="#ffffff" className="text-white" />
          )}
        </button>
      </div>

      {/* Secondary filter row — same wrapper width as search row */}
      <div className="mt-2 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          className="h-12 w-full rounded-2xl border-0 bg-slate-50 px-3 text-sm text-slate-700 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[rgba(52,87,155,0.2)]"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        <CountySelect
          value={county ?? ""}
          onChange={(v) => {
            setCounty(v || undefined);
            setArea(undefined);
          }}
          ariaLabel="County"
          className="h-12 w-full rounded-2xl border-0 bg-slate-50 px-3 text-sm text-slate-700 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[rgba(52,87,155,0.2)]"
        />

        <AreaSelect
          county={county}
          value={area ?? ""}
          onChange={(v) => setArea(v || undefined)}
          ariaLabel="Area"
          placeholder="All areas"
          className="h-12 w-full rounded-2xl border-0 bg-slate-50 px-3 text-sm text-slate-700 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[rgba(52,87,155,0.2)]"
        />
      </div>
    </form>
  );
}
