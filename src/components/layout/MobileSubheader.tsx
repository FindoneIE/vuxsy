"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";

const LINKS = [
  { label: "Services", href: "/services" },
  { label: "Get Help", href: "/requests" },
  { label: "Marketplace", href: "/marketplace" },
];

let mobileSubheaderRenderCount = 0;

export default function MobileSubheader() {
  const DEV = process.env.NODE_ENV !== "production";
  const renderCount = ++mobileSubheaderRenderCount;

  const pathname = usePathname();
  const isDetailPage = Boolean(
    pathname?.match(/^\/(services|requests|marketplace)\/[^/]+\/[^/]+/)
  );

  const handleTabClick = (href: string) => {
    try {
      sessionStorage.setItem("heroActiveTab", href);
      window.dispatchEvent(new CustomEvent("hero:tab-change", { detail: href }));
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    if (!DEV) return;
    console.debug("[mount-trace] MobileSubheader mount", {
      pathname,
      renderCount,
    });
    return () => {
      console.debug("[mount-trace] MobileSubheader unmount", { pathname });
    };
  }, [DEV, pathname]);

  if (DEV) {
    console.debug("[mount-trace] MobileSubheader render", {
      pathname,
      isDetailPage,
      renderCount,
    });
    if (typeof performance !== "undefined") {
      performance.mark(`MobileSubheader:render:${renderCount}`);
    }
  }

  if (isDetailPage) {
    return <div className="mobile-subheader-spacer" aria-hidden />;
  }

  return (
    <div className="mobile-subheader" role="navigation" aria-label="Browse">
      <PageContainer className="mobile-subheader__inner">
        {LINKS.map((link) => {
          const isActive = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              className={`mobile-subheader__link${isActive ? " is-active" : ""}`}
              href={link.href}
              onClick={() => handleTabClick(link.href)}
            >
              {link.label}
            </Link>
          );
        })}
      </PageContainer>
    </div>
  );
}
