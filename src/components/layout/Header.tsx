"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Mail, Bell, Heart, Menu, XIcon, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { logOut } from "@/lib/auth";
import PageContainer from "@/components/layout/PageContainer";
import MobileQuickSearchSheet from "@/components/search/MobileQuickSearchSheet";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const { user, loading } = useAuth();
  const createListingHref = user ? "/publish" : "/login?redirect=/publish";
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboard");

  const dashboardSections = [
    {
      label: "Primary",
      items: [
        { label: "My listings", href: "/dashboard/listings" },
        { label: "Messages", href: "/dashboard/messages" },
      ],
    },
    {
      label: "Dashboard",
      items: [
        { label: "Overview", href: "/dashboard" },
        { label: "Saved", href: "/dashboard/saved" },
        { label: "Settings", href: "/dashboard/settings" },
      ],
    },
    {
      label: "Business",
      items: [
        { label: "Billing", href: "/dashboard/billing" },
        { label: "Promotions", href: "/dashboard/promotions" },
        { label: "Business profile", href: "/dashboard/business-profile" },
      ],
    },
    {
      label: "Browse",
      items: [
        { label: "Services", href: "/services" },
        { label: "Requests", href: "/requests" },
        { label: "Marketplace", href: "/marketplace" },
      ],
    },
  ];

  const mobileSiteLinks = [
    { label: "Services", href: "/services" },
    { label: "Requests", href: "/requests" },
    { label: "Marketplace", href: "/marketplace" },
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
            <Image src="/logo.png" alt="Findone" className="logo-img" width={120} height={40} priority />
          </Link>
        </div>

        {/* mobile icons (visible on small screens) */}
        <div className="site-header__mobile-icons">
          <button
            className="mobile-icon"
            aria-label="Search"
            type="button"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search size={24} strokeWidth={1.75} />
          </button>

          <button className="mobile-icon" aria-label="Messages">
            <Mail size={24} strokeWidth={1.75} />
          </button>

          <button className="mobile-icon" aria-label="Notifications">
            <Bell size={24} strokeWidth={1.75} />
          </button>

          <button className="mobile-icon" aria-label="Favorites">
            <Heart size={24} strokeWidth={1.75} />
          </button>

          {/* mobile menu toggle (visible on small screens) */}
          <button
            className="site-header__mobile-toggle mobile-icon"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="sr-only">Menu</span>
            <Menu size={24} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {/* desktop actions (hidden on small screens) */}
        <div className="site-header__actions">
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
              Requests
            </Link>

            <Link
              href="/marketplace"
              className={`site-nav__link${pathname?.startsWith("/marketplace") ? " is-active" : ""}`}
            >
              Marketplace
            </Link>

            {!loading && user && (
              <Link
                href="/dashboard"
                className={`site-nav__link${pathname?.startsWith("/dashboard") ? " is-active" : ""}`}
              >
                Dashboard
              </Link>
            )}
          </nav>

          {!loading && !user && (
            <Link href="/login" className="btn btn--ghost" aria-label="Log in">
              Login
            </Link>
          )}

          {!loading && user && (
            <button type="button" className="btn btn--ghost" onClick={handleLogout}>
              Logout
            </button>
          )}

          {!loading && (
            <Link href={createListingHref} className="btn btn--accent" aria-label="Create listing">
              Create Listing
            </Link>
          )}
        </div>

        {/* mobile menu drawer */}
        {mobileOpen && (
          <div className="mobile-menu mobile-menu--fullscreen" role="dialog" aria-modal="true">
            <div className="mobile-menu__inner mobile-menu__inner--fullscreen">
              <div className="mobile-menu__header">
                <Link href="/" className="mobile-menu__logo" onClick={() => setMobileOpen(false)}>
                  <Image
                    src="/logo.png"
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
                    <XIcon className="app-close-icon" strokeWidth={2} />
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
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                className={`mobile-menu__link ${
                                  isActive ? "is-active" : ""
                                }`}
                                onClick={() => setMobileOpen(false)}
                              >
                                {link.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div className="mobile-menu__section">
                      <p className="mobile-menu__section-title">Actions</p>
                      <div className="mobile-menu__section-links">
                        {!loading && (
                          <Link
                            href={createListingHref}
                            className="mobile-menu__link mobile-menu__link--accent"
                            onClick={() => setMobileOpen(false)}
                          >
                            Create listing
                          </Link>
                        )}
                        {!loading && user && (
                          <button
                            type="button"
                            className="mobile-menu__link mobile-menu__link--danger"
                            onClick={async () => {
                              await handleLogout();
                              setMobileOpen(false);
                            }}
                          >
                            Log out
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mobile-menu__section">
                      <p className="mobile-menu__section-title">Browse</p>
                      <div className="mobile-menu__section-links">
                        {mobileSiteLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="mobile-menu__link"
                            onClick={() => setMobileOpen(false)}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                    {!loading && user && (
                      <div className="mobile-menu__section">
                        <p className="mobile-menu__section-title">Account</p>
                        <div className="mobile-menu__section-links">
                          <Link
                            href="/dashboard"
                            className="mobile-menu__link"
                            onClick={() => setMobileOpen(false)}
                          >
                            Dashboard
                          </Link>
                          <Link
                            href="/dashboard/listings"
                            className="mobile-menu__link"
                            onClick={() => setMobileOpen(false)}
                          >
                            My listings
                          </Link>
                        </div>
                      </div>
                    )}
                    <div className="mobile-menu__section">
                      <p className="mobile-menu__section-title">Actions</p>
                      <div className="mobile-menu__section-links">
                        {!loading && !user && (
                          <Link
                            href="/login"
                            className="mobile-menu__link"
                            onClick={() => setMobileOpen(false)}
                          >
                            Login
                          </Link>
                        )}
                        {!loading && user && (
                          <button
                            type="button"
                            className="mobile-menu__link mobile-menu__link--danger"
                            onClick={async () => {
                              await handleLogout();
                              setMobileOpen(false);
                            }}
                          >
                            Log out
                          </button>
                        )}
                        {!loading && (
                          <Link
                            href={createListingHref}
                            className="mobile-menu__link mobile-menu__link--accent"
                            onClick={() => setMobileOpen(false)}
                          >
                            Create listing
                          </Link>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </nav>
            </div>
          </div>
        )}

        <MobileQuickSearchSheet
          open={mobileSearchOpen}
          onClose={() => setMobileSearchOpen(false)}
        />

      </div>
      </PageContainer>
    </header>
  );
}