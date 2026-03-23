"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string };

const TABS: Tab[] = [
  { href: "/services", label: "Services" },
  { href: "/requests", label: "Requests" },
  { href: "/marketplace", label: "Marketplace" },
];

export default function HeroTabs() {
  const pathname = usePathname() ?? "/";

  // active tab is stored as the href (e.g. '/services').
  // Use pathname to derive the initial value so server and first-client render match.
  const [active, setActive] = React.useState<string>(() => {
    if (pathname === "/") return "/services";
    if (pathname.startsWith("/requests")) return "/requests";
    if (pathname.startsWith("/marketplace")) return "/marketplace";
    if (pathname.startsWith("/services")) return "/services";
    return "/services";
  });

  // After mounting on the client, prefer any previously selected tab stored in
  // sessionStorage. Doing this in an effect avoids hydration mismatches because
  // the initial render matches the server output.
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem("heroActiveTab");
        if (stored && stored !== active) setActive(stored);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep sessionStorage in sync when active changes
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") sessionStorage.setItem("heroActiveTab", active);
    } catch {
      // ignore
    }
  }, [active]);

  return (
    <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }} className="hero-tabs">
      {TABS.map((t) => {
        const isActive = active === t.href;

        // Keep the Link in the markup for visual consistency, but prevent its default
        // navigation behavior so clicking only updates local state.
        return (
          <Link
            key={t.href}
            href={t.href}
            className={"site-nav__link hero-tab" + (isActive ? " is-active" : "")}
            onClick={(e) => {
              // prevent navigation; only update local state
              try {
                e.preventDefault();
              } catch {
                /* noop */
              }

              setActive(t.href);
              try {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("hero:tab-change", { detail: t.href }));
                }
              } catch {
                // ignore
              }
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
