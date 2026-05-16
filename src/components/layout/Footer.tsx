"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FacebookLogo, InstagramLogo, XLogo } from "@phosphor-icons/react";

const marketplaceLinks = [
  { label: "Browse Services", href: "/services" },
  { label: "Get Help", href: "/requests" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Create Listing", href: "/publish" },
];

const supportLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Safety Tips", href: "/safety" },
  { label: "Report Listing", href: "/report-listing" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Cookie Policy", href: "/cookie-policy" },
];

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com", icon: InstagramLogo },
  { label: "Facebook", href: "https://facebook.com", icon: FacebookLogo },
  { label: "X", href: "https://x.com", icon: XLogo },
];

let footerRenderCount = 0;
let footerMountSequence = 0;

export default function Footer() {
  const DEV = process.env.NODE_ENV !== "production";
  const renderCount = ++footerRenderCount;

  const pathname = usePathname();

  if (DEV) {
    console.debug("[mount-trace] Footer render", {
      pathname,
      renderCount,
    });
    if (typeof performance !== "undefined") {
      performance.mark(`Footer:render:${renderCount}`);
    }
    if (typeof console.timeStamp === "function") {
      console.timeStamp(`Footer render ${renderCount}`);
    }
  }

  React.useEffect(() => {
    if (!DEV) return;

    footerMountSequence += 1;
    const mountId = footerMountSequence;
    const footerCount = document.querySelectorAll('footer[aria-label="Site footer"]').length;

    console.debug("Footer mounted", {
      file: "src/components/layout/Footer.tsx",
      mountId,
      footerCount,
    });

    return () => {
      const liveFooterCount = document.querySelectorAll('footer[aria-label="Site footer"]').length;
      console.debug("Footer unmounted", {
        file: "src/components/layout/Footer.tsx",
        mountId,
        footerCount: liveFooterCount,
      });
    };
  }, [DEV]);

  const isLinkActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <footer className="site-footer mt-14 border-t-[3px] border-t-(--color-primary) bg-[#303941] text-white" aria-label="Site footer">
      <div className="mx-auto w-full max-w-300 px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="space-y-4 text-center sm:text-left">
            <Link href="/" className="inline-flex items-center" aria-label="Vuxsy home">
              <Image
                src="/logo.svg"
                alt="Vuxsy"
                width={128}
                height={40}
                className="h-10 w-auto filter-[brightness(0)_invert(1)]"
                priority={false}
              />
            </Link>
            <p className="mx-auto max-w-xs text-sm leading-6 text-slate-100 sm:mx-0">
              Local services, jobs and marketplace listings in one place.
            </p>

            <div className="flex items-center gap-2 pt-1">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/30 text-slate-100 transition hover:border-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Icon size={18} weight="regular" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Marketplace" links={marketplaceLinks} isLinkActive={isLinkActive} />
          <FooterColumn title="Support" links={supportLinks} isLinkActive={isLinkActive} />
          <FooterColumn title="Legal" links={legalLinks} isLinkActive={isLinkActive} />
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="mx-auto flex w-full max-w-300 flex-col gap-2 px-4 py-4 text-center text-sm text-slate-100 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <p>© 2026 Vuxsy. All rights reserved.</p>
          <a
            href="mailto:support@vuxsy.com"
            className="footer-link text-slate-100 visited:text-slate-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            support@vuxsy.com
          </a>
        </div>
      </div>
    </footer>
  );
}

type FooterColumnProps = {
  title: string;
  links: Array<{ label: string; href: string }>;
  isLinkActive: (href: string) => boolean;
};

function FooterColumn({ title, links, isLinkActive }: FooterColumnProps) {
  return (
    <div className="text-center sm:text-left">
  <h3 className="text-sm font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => {
          const active = isLinkActive(link.href);

          return (
            <li key={link.label}>
              <Link
                href={link.href}
                className={`footer-link text-sm text-slate-100 visited:text-slate-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
