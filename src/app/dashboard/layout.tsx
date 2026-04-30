"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Building2,
  ClipboardList,
  CreditCard,
  FileQuestion,
  LogOut,
  Megaphone,
  MessageCircle,
  Settings,
  Store,
  Wrench,
} from "@/components/ui/Icon";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import UserAvatar from "@/components/ui/UserAvatar";
import VuxsyVerifiedBadge from "@/components/ui/VuxsyVerifiedBadge";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Listings",
    items: [
      { label: "All listings", href: "/dashboard/listings", icon: ClipboardList },
      { label: "Services", href: "/dashboard/services", icon: Wrench },
      { label: "Get Help", href: "/dashboard/requests", icon: FileQuestion },
      { label: "Marketplace", href: "/dashboard/marketplace", icon: Store },
    ],
  },
  {
    label: "Communication",
    items: [{ label: "Messages", href: "/dashboard/messages", icon: MessageCircle }],
  },
  {
    label: "User",
    items: [
      { label: "Saved", href: "/dashboard/saved", icon: Bookmark },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
      { label: "Promotions", href: "/dashboard/promotions", icon: Megaphone },
      { label: "Business profile", href: "/dashboard/business-profile", icon: Building2 },
    ],
  },
];

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  const pathname = usePathname();
  const { user, profile, loading, profileLoading } = useAuth();
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const isProfileReady = !loading && !profileLoading;
  const resolvedGooglePhotoUrl =
    profile?.googlePhotoUrl ?? (metadata?.avatar_url as string | undefined) ?? null;
  const resolvedDisplayName = isProfileReady
    ? profile?.displayName ?? user?.email ?? null
    : null;
  const resolvedEmail = isProfileReady ? profile?.email ?? user?.email ?? null : null;
  const isOfficialVuxsy = resolvedDisplayName === "VUXSY";
  const isListingsSection =
    pathname === "/dashboard/listings" ||
    pathname === "/dashboard/services" ||
    pathname === "/dashboard/requests" ||
    pathname === "/dashboard/marketplace";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-(--bg-page)">
        <div className="pt-4 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <aside className="hidden w-60 shrink-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:block">
            <div className="mb-5 flex items-center gap-3">
              <UserAvatar
                avatarUrl={isProfileReady ? profile?.avatarUrl ?? null : null}
                googlePhotoUrl={resolvedGooglePhotoUrl}
                displayName={resolvedDisplayName}
                email={resolvedEmail}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href="/dashboard"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
                >
                  Dashboard
                </Link>
                <div className="mt-1 min-h-10">
                  {isProfileReady ? (
                    <>
                      {resolvedDisplayName ? (
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {isOfficialVuxsy ? (
                            <span className="inline-flex items-center">
                              VUXSY
                              <VuxsyVerifiedBadge
                                displayName={resolvedDisplayName}
                                size={14}
                              />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {resolvedDisplayName}
                            </span>
                          )}
                        </p>
                      ) : null}
                      <p
                        className={
                          resolvedDisplayName
                            ? "mt-1 truncate text-xs font-normal text-slate-500"
                            : "truncate text-sm font-normal text-slate-500"
                        }
                      >
                        {resolvedEmail ?? ""}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
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
                            "filters-sidebar__category-row text-gray-800 hover:bg-gray-50 transition-colors duration-150",
                            isActive && "is-active bg-primary/10 text-primary ring-1 ring-primary/15"
                          )}
                        >
                          {item.icon ? (
                            <span className="filters-sidebar__category-icon">
                              <item.icon
                                className={cn(
                                  "w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-gray-800",
                                  isActive && "text-primary"
                                )}
                                aria-hidden
                              />
                            </span>
                          ) : null}
                          <span className="filters-sidebar__category-label">{item.label}</span>
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
                className="filters-sidebar__category-row text-gray-800 hover:bg-gray-50 transition-colors duration-150"
              >
                <span className="filters-sidebar__category-icon">
                  <LogOut
                    className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-gray-800"
                    aria-hidden
                  />
                </span>
                <span className="filters-sidebar__category-label">Log out</span>
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
