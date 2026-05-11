"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import {
  ClipboardList,
  Heart,
  LogOut,
  MessageCircle,
  User,
} from "@/components/ui/Icon";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import UserAvatar from "@/components/ui/UserAvatar";
import VuxsyVerifiedBadge from "@/components/ui/VuxsyVerifiedBadge";
import { cn } from "@/lib/utils";
import { logOut } from "@/lib/auth";

const navSections = [
  [
    { label: "My listings", href: "/dashboard/listings", icon: ClipboardList },
  ],
  [{ label: "Messages", href: "/dashboard/messages", icon: MessageCircle }],
  [
    { label: "Saved listings", href: "/dashboard/saved", icon: Heart },
    { label: "Profile", href: "/dashboard/settings", icon: User },
  ],
];

type Props = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  const { user, profile, loading, profileLoading } = useAuth();
  const handleLogout = async () => {
    await logOut();
    window.location.href = "/";
  };
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
    pathname === "/dashboard/listings" || pathname === "/dashboard/saved";
  const isMessagesSection = pathname?.startsWith("/dashboard/messages");
  const isProfileSection = pathname === "/dashboard/settings";
  const isEditListingPage = pathname?.startsWith("/dashboard/listings/") &&
    pathname?.endsWith("/edit");
  const isAdminSection = segments?.includes("admin");
  const isFlatDashboardPage =
    isListingsSection ||
    isMessagesSection ||
    isProfileSection ||
    isEditListingPage ||
    isAdminSection;
  const flatMainClass = "bg-transparent p-0 shadow-none";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-(--bg-page)">
        <div className="pt-4 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <aside className="hidden w-60 shrink-0 py-5 pr-5 pl-0 lg:block" data-ls="dashboard-sidebar">
            <div className="mb-5 flex items-center gap-3">
              <UserAvatar
                avatarUrl={isProfileReady ? profile?.avatarUrl ?? null : null}
                googlePhotoUrl={resolvedGooglePhotoUrl}
                displayName={resolvedDisplayName}
                email={resolvedEmail}
                size={40}
                showFallbackIcon={false}
              />
              <div className="min-w-0 flex-1">
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
                      ) : (
                        <span className="block h-4 w-32 bg-slate-100" aria-hidden />
                      )}
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
                  ) : (
                    <div className="space-y-2" aria-hidden>
                      <div className="h-4 w-28 bg-slate-100" />
                      <div className="h-3 w-32 bg-slate-100" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <nav className="space-y-4">
              {navSections.map((section, index) => (
                <div
                  key={section.map((item) => item.href).join("-")}
                  className={cn("flex flex-col gap-4", index > 0 && "mt-2")}
                >
                  {section.map((item) => {
                    const isActive = (() => {
                      if (item.href === "/dashboard/messages") {
                        return pathname?.startsWith("/dashboard/messages") ?? false;
                      }
                      if (item.href === "/dashboard/listings") {
                        return pathname === "/dashboard/listings" || pathname?.startsWith("/dashboard/listings/");
                      }
                      if (item.href === "/dashboard/saved") {
                        return pathname === "/dashboard/saved";
                      }
                      if (item.href === "/dashboard/settings") {
                        return pathname === "/dashboard/settings";
                      }
                      return pathname === item.href;
                    })();
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "dashboard-sidebar-item",
                          isActive && "is-active"
                        )}
                      >
                        {item.icon ? (
                          <span className="filters-sidebar__category-icon">
                            <item.icon
                              className={cn("w-5 h-5 sm:w-6 sm:h-6 shrink-0")}
                              color={isActive ? "var(--brand)" : "var(--text-secondary)"}
                              weight={isActive ? "fill" : "regular"}
                              aria-hidden
                            />
                          </span>
                        ) : null}
                        <span className="filters-sidebar__category-label text-sm">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <div
                role="button"
                tabIndex={0}
                className="dashboard-sidebar-item dashboard-sidebar-item--logout text-red-600"
                onClick={handleLogout}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleLogout();
                  }
                }}
              >
                <span className="filters-sidebar__category-icon">
                  <LogOut
                    className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-red-600"
                    weight="regular"
                    aria-hidden
                  />
                </span>
                <span className="filters-sidebar__category-label">Log out</span>
              </div>
            </div>
          </aside>

            <main
              className={cn(
                "w-full",
                isFlatDashboardPage
                  ? flatMainClass
                  : "flex-1 rounded-2xl border border-slate-200/70 bg-white p-2 shadow-md sm:p-4 lg:p-6"
              )}
              data-ls="dashboard-main"
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
