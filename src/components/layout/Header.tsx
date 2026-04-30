"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Building2,
  ClipboardList,
  CreditCard,
  FileQuestion,
  Heart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Search,
  Settings,
  Store,
  Wrench,
  XIcon,
} from "@/components/ui/Icon";
import { useAuth } from "@/components/auth/AuthProvider";
import { logOut } from "@/lib/auth";
import AvatarDropdown from "@/components/layout/AvatarDropdown";
import PageContainer from "@/components/layout/PageContainer";
import MobileQuickSearchSheet from "@/components/search/MobileQuickSearchSheet";
import { useSavedListings } from "@/components/listings/SavedListingsProvider";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const { user, loading, avatarData, profile } = useAuth();
  const { count: savedCount, isLoaded: savedLoaded } = useSavedListings();
  const createListingHref = user ? "/publish" : "/login?redirect=/publish";
  const showSavedBadge = profile?.showSavedBadge ?? true;
  const savedHref = user
    ? "/dashboard/saved"
    : `/login?redirect=${encodeURIComponent("/dashboard/saved")}`;
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");
  const isAdmin = profile?.role === "admin";
  const [pendingReports, setPendingReports] = useState<number | null>(null);
  const [reportPollingEnabled, setReportPollingEnabled] = useState(true);
  const canPollAdminReports = Boolean(user) && isAdmin;

  const fetchReportCount = useMemo(
    () => async () => {
      if (!canPollAdminReports || !reportPollingEnabled) return;
      try {
        const response = await fetch("/api/admin/report-count", {
          method: "GET",
          cache: "no-store",
        });
        if (response.status === 401) {
          setReportPollingEnabled(false);
          setPendingReports(null);
          return;
        }
        if (!response.ok) return;
        const data = (await response.json()) as { count?: number };
        setPendingReports(typeof data.count === "number" ? data.count : 0);
      } catch {
        // ignore
      }
    },
    [canPollAdminReports, reportPollingEnabled]
  );

  useEffect(() => {
    if (!canPollAdminReports || !reportPollingEnabled) return;
    const timeoutId = window.setTimeout(fetchReportCount, 0);
    const intervalId = window.setInterval(fetchReportCount, 10000);
    const handleUpdate = () => fetchReportCount();
    window.addEventListener("admin-reports-updated", handleUpdate);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("admin-reports-updated", handleUpdate);
    };
  }, [fetchReportCount, canPollAdminReports, reportPollingEnabled]);

  useEffect(() => {
    if (canPollAdminReports) return;
    const id = window.setTimeout(() => {
      setPendingReports(null);
      setReportPollingEnabled(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [canPollAdminReports]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("drawer-open", mobileOpen);
    document.body.classList.toggle("drawer-open", mobileOpen);
    return () => {
      document.documentElement.classList.remove("drawer-open");
      document.body.classList.remove("drawer-open");
    };
  }, [mobileOpen]);

  const visiblePendingReports = isAdmin ? pendingReports : null;
  const badgeLabel =
    visiblePendingReports && visiblePendingReports > 99
      ? "99+"
      : visiblePendingReports?.toString();

  const dashboardSections = [
    {
      label: "Primary",
      items: [
        { label: "My listings", href: "/dashboard/listings", icon: ClipboardList },
        { label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
      ],
    },
    {
      label: "Dashboard",
      items: [
        { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { label: "Saved", href: "/dashboard/saved", icon: Bookmark },
        { label: "Settings", href: "/dashboard/settings", icon: Settings },
      ],
    },
    {
      label: "Business",
      items: [
        { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
        { label: "Promotions", href: "/dashboard/promotions", icon: Megaphone },
        {
          label: "Business profile",
          href: "/dashboard/business-profile",
          icon: Building2,
        },
      ],
    },
    {
      label: "Browse",
      items: [
        { label: "Services", href: "/services", icon: Wrench },
        { label: "Get Help", href: "/requests", icon: FileQuestion },
        { label: "Marketplace", href: "/marketplace", icon: Store },
      ],
    },
  ];

  const accountLinks = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My listings", href: "/dashboard/listings", icon: ClipboardList },
  ];

  const mobileSiteLinks = [
    { label: "Services", href: "/services", icon: Wrench },
    { label: "Get Help", href: "/requests", icon: FileQuestion },
    { label: "Marketplace", href: "/marketplace", icon: Store },
  ];

  const handleLogout = async () => {
    await logOut();
  };

  return (
    <header className="site-header" role="banner">
      <PageContainer>
        <div className="site-header__inner">

        <div className="site-header__logo">
          <Link href="/" className="section-title">
            <Image src="/logo.svg" alt="Findone" className="logo-img" width={120} height={40} priority />
          </Link>
        </div>

        {/* mobile icons (visible on small screens) */}
        <div className="site-header__mobile-icons flex items-center gap-2 sm:gap-3">
          <button
            className="mobile-icon"
            aria-label="Search"
            type="button"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="w-7 h-7" weight="regular" />
          </button>

          <Link
            href={savedHref}
            className="mobile-icon relative"
            aria-label="Saved listings"
          >
            <Heart
              className={`w-7 h-7 ${savedLoaded && savedCount > 0 ? "text-[#111827]" : "text-[#6b7280]"}`}
              weight={savedLoaded && savedCount > 0 ? "fill" : "regular"}
            />
            {showSavedBadge && savedLoaded && savedCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                {savedCount > 99 ? "99+" : savedCount}
              </span>
            ) : null}
          </Link>

          {/* mobile menu toggle (visible on small screens) */}
          <button
            className="site-header__mobile-toggle mobile-icon"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="sr-only">Menu</span>
            <Menu className="w-7 h-7" weight="regular" aria-hidden />
          </button>
        </div>

        {/* desktop actions (hidden on small screens) */}
  <div className="site-header__actions flex items-center gap-3">
          <nav className="site-header__nav" aria-label="Main navigation">
            <Link
              href="/services"
              className={`site-nav__link${pathname?.startsWith("/services") ? " is-active" : ""}`}
            >
              Services
            </Link>

            <Link
              href="/requests"
              className={`site-nav__link${pathname?.startsWith("/requests") ? " is-active" : ""}`}
            >
              Get Help
            </Link>

            <Link
              href="/marketplace"
              className={`site-nav__link${pathname?.startsWith("/marketplace") ? " is-active" : ""}`}
            >
              Marketplace
            </Link>

            {isAdmin ? (
              <span className="relative inline-flex items-center">
                <Link
                  href="/dashboard/admin"
                  className={`site-nav__link${pathname?.startsWith("/dashboard/admin") ? " is-active" : ""}`}
                >
                  Admin
                </Link>
                {visiblePendingReports && visiblePendingReports > 0 ? (
                  <span className="absolute -right-3 -top-2 flex min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                    {badgeLabel}
                  </span>
                ) : null}
              </span>
            ) : null}

          </nav>

          {!loading && user && (
            <div className="flex items-center self-center mr-1">
              <AvatarDropdown avatarData={avatarData} onLogout={handleLogout} />
            </div>
          )}

          {!loading && !user && (
            <Link href="/login" className="btn btn--ghost" aria-label="Log in">
              Login
            </Link>
          )}

          {!loading && (
            <Link href={createListingHref} className="btn btn--accent" aria-label="Create listing">
              Create Listing
            </Link>
          )}
        </div>

        <MobileQuickSearchSheet
          open={mobileSearchOpen}
          onClose={() => setMobileSearchOpen(false)}
        />

      </div>
      </PageContainer>

      {/* mobile menu drawer */}
      <div
        className={`mobile-menu mobile-menu--fullscreen fixed inset-0 isolate z-50 bg-primary/10 duration-100 supports-backdrop-filter:backdrop-blur-xs${
          mobileOpen ? " is-open" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      >
        <div
          className={`mobile-menu__inner mobile-menu__inner--fullscreen mobile-drawer${
            mobileOpen ? " open" : ""
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mobile-menu__header">
            <Link href="/" className="mobile-menu__logo" onClick={() => setMobileOpen(false)}>
              <Image
                src="/logo.svg"
                alt="Findone"
                className="logo-img"
                width={120}
                height={40}
              />
            </Link>
            <button
              className="app-close-button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <XIcon className="app-close-icon" />
            </button>
          </div>
          <nav className="mobile-menu__nav">
            {isDashboard ? (
              <>
                {dashboardSections.map((section) => (
                  <div key={section.label} className="mobile-menu__section">
                    <p className="mobile-menu__section-title">{section.label}</p>
                    <div className="mobile-menu__section-links">
                      {section.items.map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={`mobile-menu__row menu-item ${isActive ? "is-active" : ""}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="mobile-menu__icon-wrap menu-item__icon">
                              <Icon className="mobile-menu__icon" weight="regular" />
                            </span>
                            <span className="mobile-menu__row-label">{link.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="mobile-menu__section">
                  <p className="mobile-menu__section-title">Browse</p>
                  <div className="mobile-menu__section-links">
                    {mobileSiteLinks.map((link) => {
                      const isActive = pathname === link.href;
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`mobile-menu__row menu-item ${isActive ? "is-active" : ""}`}
                          onClick={() => setMobileOpen(false)}
                        >
                          <span className="mobile-menu__icon-wrap menu-item__icon">
                            <Icon className="mobile-menu__icon" weight="regular" />
                          </span>
                          <span className="mobile-menu__row-label">{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                {!loading && user && (
                  <div className="mobile-menu__section">
                    <p className="mobile-menu__section-title">Account</p>
                    <div className="mobile-menu__section-links">
                      {accountLinks.map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={`mobile-menu__row menu-item ${isActive ? "is-active" : ""}`}
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="mobile-menu__icon-wrap menu-item__icon">
                              <Icon className="mobile-menu__icon" weight="regular" />
                            </span>
                            <span className="mobile-menu__row-label">{link.label}</span>
                          </Link>
                        );
                      })}
                      {isAdmin ? (
                        <Link
                          href="/dashboard/admin"
                          className="mobile-menu__row menu-item"
                          onClick={() => setMobileOpen(false)}
                        >
                          <span className="mobile-menu__icon-wrap menu-item__icon">
                            <LayoutDashboard className="mobile-menu__icon" weight="regular" />
                          </span>
                          <span className="mobile-menu__row-label">Admin</span>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                )}
              </>
            )}
          </nav>
          <div className="mobile-menu__footer drawer-bottom">
            {!loading && user ? (
              <>
                <div className="menu-divider" />
                <button
                  type="button"
                  className="mobile-menu__row menu-item menu-danger logout"
                  onClick={async () => {
                    await handleLogout();
                    setMobileOpen(false);
                  }}
                >
                  <span className="mobile-menu__icon-wrap menu-item__icon">
                    <LogOut className="mobile-menu__icon" weight="regular" />
                  </span>
                  <span className="mobile-menu__row-label">Log out</span>
                </button>
              </>
            ) : null}
            {!loading && (
              <Link
                href={createListingHref}
                className="mobile-menu__cta create-listing-btn primary-action-button drawer-create-button"
                onClick={() => setMobileOpen(false)}
              >
                Create listing
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}