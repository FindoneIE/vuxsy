import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.headers.get("RSC")) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server-side redirect for unauthenticated users hitting protected routes.
  // Previously these routes rendered an empty body (ProtectedRoute returned
  // null) on first paint and then client-side router.replace()'d to /login,
  // producing a footer jump. Redirecting in middleware keeps the browser
  // from ever rendering an empty protected page.
  const PROTECTED_PREFIXES = ["/dashboard", "/messages", "/publish"];
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = `?redirect=${encodeURIComponent(
      pathname + (request.nextUrl.search || ""),
    )}`;
    return NextResponse.redirect(redirectUrl);
  }

  // Role-based protection for admin routes. The user is already confirmed
  // authenticated above. Query profiles.role to verify admin access before
  // any page component renders — this is the server-side gate.
  const isAdminRoute =
    user &&
    (pathname === "/dashboard/admin" ||
      pathname.startsWith("/dashboard/admin/"));

  if (isAdminRoute) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileData?.role !== "admin") {
      const adminRedirectUrl = request.nextUrl.clone();
      adminRedirectUrl.pathname = "/dashboard";
      adminRedirectUrl.search = "";
      return NextResponse.redirect(adminRedirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};