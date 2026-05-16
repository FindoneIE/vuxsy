"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import MobileSubheader from "@/components/layout/MobileSubheader";
import PageContainer from "@/components/layout/PageContainer";
import Footer from "@/components/layout/Footer";
import CookieBanner from "@/components/layout/CookieBanner";

type Props = {
  children: React.ReactNode;
};

let appShellRenderCount = 0;

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const DEV = process.env.NODE_ENV !== "production";
  const renderCount = ++appShellRenderCount;

  if (DEV) {
    console.debug("[mount-trace] AppShell render", {
      renderCount,
      pathname,
    });
    if (typeof performance !== "undefined") {
      performance.mark(`AppShell:render:${renderCount}`);
    }
    if (typeof console.timeStamp === "function") {
      console.timeStamp(`AppShell render ${renderCount}`);
    }
  }

  React.useEffect(() => {
    if (!DEV) return;
    console.debug("[mount-trace] AppShell mount", { pathname });
    if (typeof performance !== "undefined") {
      performance.mark("AppShell:mount");
    }

    const sampleHeights = (label: string) => {
      const main = document.querySelector<HTMLElement>('main[data-ls="page-shell"]');
      const footer = document.querySelector<HTMLElement>('footer[aria-label="Site footer"]');
      const header = document.querySelector<HTMLElement>('header[data-ls="header"]');
      console.debug("[mount-trace] AppShell layout snapshot", {
        label,
        pathname,
        mainHeight: main ? Math.round(main.getBoundingClientRect().height) : null,
        mainTop: main ? Math.round(main.getBoundingClientRect().top) : null,
        footerTop: footer ? Math.round(footer.getBoundingClientRect().top) : null,
        footerHeight: footer ? Math.round(footer.getBoundingClientRect().height) : null,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
        scrollY: Math.round(window.scrollY),
      });
    };

    sampleHeights("effect-immediate");
    const t1 = window.setTimeout(() => sampleHeights("effect+80ms"), 80);
    const t2 = window.setTimeout(() => sampleHeights("effect+300ms"), 300);
    const t3 = window.setTimeout(() => sampleHeights("effect+900ms"), 900);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      console.debug("[mount-trace] AppShell unmount", { pathname });
    };
  }, [DEV, pathname]);

  return (
    <div
      className="page-shell__root"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      data-ls="content-wrapper"
    >
      <Header />
      <MobileSubheader />

      {/* Main content area: PageContainer already applies the .page-shell class
          and the global tokens. Pages should render inside this area. */}
      <PageContainer as="main" style={{ flex: "1 0 auto" }} data-ls="page-shell">
        {children}
      </PageContainer>
      <Footer />
      <CookieBanner />
    </div>
  );
}
