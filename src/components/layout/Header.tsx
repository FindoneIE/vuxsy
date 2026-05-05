"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Heart,
  LogOut,
  ListLines,
  MessageCircle,
  Search,
  User,
  UserRound,
  XIcon,
} from "@/components/ui/Icon";
import { useAuth } from "@/components/auth/AuthProvider";
import { logOut } from "@/lib/auth";
import AvatarDropdown from "@/components/layout/AvatarDropdown";
import PageContainer from "@/components/layout/PageContainer";
import MobileQuickSearchSheet from "@/components/search/MobileQuickSearchSheet";
import { useSavedListings } from "@/components/listings/SavedListingsProvider";
import UserAvatar from "@/components/ui/UserAvatar";
import useMediaQuery from "../../hooks/useMediaQuery";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { user, loading, avatarData, profile } = useAuth();
  const { count: savedCount, isLoaded: savedLoaded } = useSavedListings();
  const createListingHref = user ? "/publish" : "/login?redirect=/publish";
  const showSavedBadge = profile?.showSavedBadge ?? true;
  const savedHref = user
    ? "/dashboard/saved"
    : `/login?redirect=${encodeURIComponent("/dashboard/saved")}`;
  const pathname = usePathname();
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

  const accountLinks = [
    { label: "My Listings", href: "/dashboard/listings", icon: ClipboardList },
    { label: "Messages", href: "/dashboard/messages", icon: MessageCircle },
    { label: "Saved", href: "/dashboard/saved", icon: Heart },
    { label: "Profile", href: "/dashboard/settings", icon: User },
  ];

  const displayName =
    avatarData?.displayName ?? profile?.displayName ?? user?.email ?? null;
  const displayEmail = avatarData?.email ?? profile?.email ?? user?.email ?? null;
  const avatarUrl = avatarData?.avatarUrl ?? profile?.avatarUrl ?? null;
  const googlePhotoUrl = avatarData?.googlePhotoUrl ?? profile?.googlePhotoUrl ?? null;
  const isAuthReady = !loading;

  const handleLogout = async () => {
    await logOut();
  };

  return (
    <header className="site-header" role="banner" data-ls="header">
      {isMobile ? (
        <>
          <PageContainer data-ls="header-container">
            <div className="site-header__inner site-header__mobile" data-ls="header-mobile">
              <div className="site-header__logo" data-ls="logo-slot">
                <Link href="/" className="section-title" onClick={() => setMobileOpen(false)}>
                  <Image
                    src="/logo.svg"
                    alt="Findone"
                    className="logo-img"
                    width={120}
                    height={40}
                    priority
                  />
                </Link>
              </div>

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

                <button
                  className="site-header__mobile-toggle mobile-icon"
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileOpen}
                  onClick={() => setMobileOpen((prev) => !prev)}
                >
                  <span className="sr-only">Menu</span>
                  <ListLines className="w-7 h-7" weight="regular" aria-hidden />
                </button>
              </div>
            </div>
          </PageContainer>

          <MobileQuickSearchSheet
            open={mobileSearchOpen}
            onClose={() => setMobileSearchOpen(false)}
          />

          <div
            className={`mobile-menu mobile-menu--fullscreen fixed inset-0 isolate z-50 bg-(--page-bg)/90 duration-100 supports-backdrop-filter:backdrop-blur-xs${
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
                  <XIcon className="app-close-icon" weight="regular" />
                </button>
              </div>
              <nav className="mobile-menu__nav">
                {!loading && user ? (
                  <>
                    {(displayName || displayEmail) && (
                      <div className="mobile-menu__section">
                        <div className="flex items-center gap-3 px-3 py-3">
                          <UserAvatar
                            avatarUrl={avatarUrl}
                            googlePhotoUrl={googlePhotoUrl}
                            displayName={displayName}
                            email={displayEmail}
                            size={40}
                            showFallbackIcon={false}
                            className="bg-transparent border-transparent"
                          />
                          <div className="min-w-0">
                            {displayName ? (
                              <p className="truncate text-[14px] font-medium text-slate-900">
                                {displayName}
                              </p>
                            ) : null}
                            {displayEmail ? (
                              <p className="truncate text-[12px] text-slate-500">{displayEmail}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="mobile-menu__section">
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
                                <Icon
                                  className="mobile-menu__icon"
                                  weight={isActive ? "fill" : "regular"}
                                />
                              </span>
                              <span className="mobile-menu__row-label">{link.label}</span>
                            </Link>
                          );
                        })}
                        <button
                          type="button"
                          className="mobile-menu__row menu-item logout"
                          onClick={async () => {
                            await handleLogout();
                            setMobileOpen(false);
                          }}
                        >
                          <span className="mobile-menu__icon-wrap menu-item__icon">
                            <LogOut className="mobile-menu__icon text-red-600" weight="regular" />
                          </span>
                          <span className="mobile-menu__row-label text-red-600">Log out</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : !loading ? (
                  <div className="mobile-menu__section">
                    <p className="mobile-menu__section-title">Account</p>
                    <div className="mobile-menu__section-links">
                      <Link
                        href="/login"
                        className="mobile-menu__row menu-item"
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="mobile-menu__icon-wrap menu-item__icon">
                          <User className="mobile-menu__icon" weight="regular" />
                        </span>
                        <span className="mobile-menu__row-label">Log in</span>
                      </Link>
                      <Link
                        href="/signup"
                        className="mobile-menu__row menu-item"
                        onClick={() => setMobileOpen(false)}
                      >
                        <span className="mobile-menu__icon-wrap menu-item__icon">
                          <UserRound className="mobile-menu__icon" weight="regular" />
                        </span>
                        <span className="mobile-menu__row-label">Sign up</span>
                      </Link>
                    </div>
                  </div>
                ) : null}
              </nav>
              <div className="mobile-menu__footer drawer-bottom">
                {!loading && (
                  <Link
                    href={createListingHref}
                    className="btn btn-primary mobile-menu__cta create-listing-btn primary-action-button drawer-create-button"
                    onClick={() => setMobileOpen(false)}
                  >
                    Create listing
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <PageContainer data-ls="header-container">
          <div className="site-header__inner site-header__desktop" data-ls="header-inner">
            <div className="site-header__logo" data-ls="logo-slot">
              <Link href="/" className="section-title">
                <Image
                  src="/logo.svg"
                  alt="Findone"
                  className="logo-img"
                  width={120}
                  height={40}
                  priority
                />
              </Link>
            </div>

            <div className="site-header__center" data-ls="center">
              <nav
                className="site-header__nav flex items-center gap-2 overflow-x-auto whitespace-nowrap px-2 -mx-2 scroll-smooth touch-pan-x sm:mx-0 sm:px-0 sm:overflow-visible"
                aria-label="Main navigation"
                data-ls="nav"
              >
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
            </div>

            <div className="site-header__actions site-header__actions-wrapper" data-ls="actions-wrapper">
              <div className="site-header__actions-group">
                <div className="site-header__auth" data-ls="auth">
                  <div className="site-header__avatar-slot" data-ls="avatar-slot">
                    {isAuthReady && user ? (
                      <AvatarDropdown
                        avatarData={avatarData}
                        onLogout={handleLogout}
                        data-ls="avatar-real"
                        className="avatar-circle"
                      />
                    ) : (
                      <div
                        className="avatar-circle site-header__auth-spacer"
                        data-ls="avatar-loading"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>

                {isAuthReady && !user && (
                  <Link href="/login" className="btn btn-outline" aria-label="Log in">
                    Login
                  </Link>
                )}

                <div className="site-header__cta" data-ls="cta">
                  {isAuthReady ? (
                    <Link href={createListingHref} className="btn btn-primary" aria-label="Create listing">
                      Create Listing
                    </Link>
                  ) : (
                    <div className="site-header__cta-spacer" aria-hidden />
                  )}
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      )}
    </header>
  );
}