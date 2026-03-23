"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Listings",
    items: [
      { label: "All listings", href: "/dashboard/listings" },
      { label: "Services", href: "/dashboard/services" },
      { label: "Requests", href: "/dashboard/requests" },
      { label: "Marketplace", href: "/dashboard/marketplace" },
    ],
  },
  {
    label: "Communication",
    items: [{ label: "Messages", href: "/dashboard/messages" }],
  },
  {
    label: "User",
    items: [
      { label: "Saved", href: "/dashboard/saved" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Billing", href: "/dashboard/billing" },
      { label: "Promotions", href: "/dashboard/promotions" },
      { label: "Business profile", href: "/dashboard/business-profile" },
    ],
  },
];

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isListingsSection =
    pathname === "/dashboard/listings" ||
    pathname === "/dashboard/services" ||
    pathname === "/dashboard/requests" ||
    pathname === "/dashboard/marketplace";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-(--bg-page)">
  <div className="pt-4 pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
          <aside className="hidden w-60 shrink-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm md:block">
            <div className="mb-5">
              <Link
                href="/dashboard"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
              >
                Dashboard
              </Link>
              <p className="mt-1 text-sm font-semibold text-slate-900">{user?.email ?? ""}</p>
            </div>

            <nav className="space-y-4">
              {navSections.map((section, index) => (
                <div
                  key={section.label}
                  className={cn("space-y-2", index > 0 && "border-t border-slate-200/70 pt-4")}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400/90">
                    {section.label}
                  </p>
                  <div className="flex flex-col gap-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "rounded-xl border-l-2 border-transparent px-3 py-2 text-sm font-medium transition",
                            isActive
                              ? "border-(--color-accent) bg-white text-slate-900 shadow-sm"
                              : "text-slate-700 hover:border-(--color-accent) hover:bg-(--bg-hover) hover:text-slate-900"
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                Log out
              </button>
            </div>
          </aside>

            <main
              className={cn(
                "w-full",
                isListingsSection
                  ? "bg-transparent p-0 shadow-none"
                  : "flex-1 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-md sm:p-6"
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
