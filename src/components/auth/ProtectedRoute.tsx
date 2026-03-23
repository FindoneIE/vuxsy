"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      const query = searchParams?.toString();
      const redirectPath = query ? `${pathname}?${query}` : pathname;
      const encoded = encodeURIComponent(redirectPath || "/");
      router.replace(`/login?redirect=${encoded}`);
    }
  }, [loading, user, router, pathname, searchParams]);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">Loading...</div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
