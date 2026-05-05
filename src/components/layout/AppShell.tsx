"use client";

import * as React from "react";
import Header from "@/components/layout/Header";
import MobileSubheader from "@/components/layout/MobileSubheader";
import PageContainer from "@/components/layout/PageContainer";

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  return (
    <div className="page-shell__root" data-ls="content-wrapper">
      <Header />
      <MobileSubheader />

      {/* Main content area: PageContainer already applies the .page-shell class
          and the global tokens. Pages should render inside this area. */}
      <PageContainer as="main" data-ls="page-shell">{children}</PageContainer>
    </div>
  );
}
