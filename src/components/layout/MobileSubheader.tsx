"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";

const LINKS = [
  { label: "Services", href: "/services" },
  { label: "Get Help", href: "/requests" },
  { label: "Marketplace", href: "/marketplace" },
];

export default function MobileSubheader() {
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

  if (isDetailPage) {
    return null;
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
