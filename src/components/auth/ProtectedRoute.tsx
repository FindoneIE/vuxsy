"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

// Inner component isolates the useSearchParams() call so it can be wrapped in
// a local Suspense boundary. Required after the root src/app/loading.tsx was
// removed (Fix 1) — without that root boundary, every prerendered route that
// reached ProtectedRoute would fail with "useSearchParams() should be wrapped
// in a suspense boundary".
function ProtectedRouteRedirect({
  user,
  loading,
}: {
  user: ReturnType<typeof useAuth>["user"];
  loading: boolean;
}) {
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

  return null;
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // `loading` is always false now: AuthProvider is SSR-seeded with the
  // authoritative user from the root layout (see src/app/layout.tsx). We
  // therefore render children immediately when authenticated — no blank
  // first-paint phase, no footer jump on /dashboard, /messages, /publish.
  const { user, loading } = useAuth();

  if (!user) {
    // Unauthenticated: kick off a client redirect to /login. Wrapped in
    // Suspense only because useSearchParams() requires a CSR-bailout
    // boundary; this branch already renders nothing visually.
    return (
      <React.Suspense fallback={null}>
        <ProtectedRouteRedirect user={user} loading={loading} />
      </React.Suspense>
    );
  }

  return <>{children}</>;
}
