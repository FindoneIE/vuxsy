import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AppShell from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { SavedListingsProvider } from "@/components/listings/SavedListingsProvider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Self-host Inter via next/font. This:
//   1. Eliminates the render-blocking external @import that used to live in
//      globals.css (which caused every element using `var(--font-ui)` to
//      repaint when Inter finished loading — the dominant cause of the
//      global UI text/logo "flash").
//   2. Provides automatic size-adjusted fallback metrics (adjustFontFallback)
//      so the system font shown during font load occupies the same box as
//      Inter — no layout shift, no width/height jump on swap.
//   3. Is preloaded by Next.js so the font is fetched on the critical path
//      and used from the first paint.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

// Architectural-fix: root layout is async so the auth session is resolved
// SERVER-SIDE via Supabase cookies and passed into `<AuthProvider>` as
// `initialUser`. This means every page — including protected ones — knows
// the authoritative auth state at first paint (SSR + first client render),
// eliminating the `<ProtectedRoute return null>` blank flash that used to
// occur on every /dashboard, /messages, /publish transition while the
// client-side `getSession()` was still in-flight.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    initialUser = data.user ?? null;
  } catch {
    // If env vars are missing or cookies are unreadable, fall back to null.
    // The client-side `getSession()` will still run as the safety net.
    initialUser = null;
  }

  return (
    // Inline `background` on <html> (and mirrored on <body>) is the final
    // first-paint fix. Render-blocking CSS sets `body { background:
    // var(--bg-page) }`, which means the browser shows its DEFAULT WHITE
    // from navigation start until the stylesheet has been downloaded AND
    // parsed. The instant the CSS resolves, body re-paints from white to
    // #F5F7FA — and because that happens in the same frame as the rest of
    // first paint, it reads to the eye as a flash on the logo / cards /
    // gallery (they appear simultaneously with the background change).
    // Putting the color in an inline style attribute makes the browser
    // honour it during HTML parsing, so the very first paint is already
    // #F5F7FA. No white → grey transition, no perceived flash.
    <html
      lang="en"
      className={inter.variable}
      style={{ background: "#F5F7FA" }}
    >
      <head>
        {/*
          Logo is a static SVG served outside the next/image optimizer,
          so next/image's automatic <link rel="preload"> does not cover
          it. Inject it manually so the browser starts fetching the logo
          during HTML parse instead of after the header component
          mounts. Eliminates the first-paint logo blink on refresh.
        */}
        <link rel="preload" as="image" href="/logo.svg" fetchPriority="high" />
      </head>
      <body style={{ background: "#F5F7FA" }}>
        <AuthProvider initialUser={initialUser}>
          <ToastProvider>
            <SavedListingsProvider>
              <AppShell>{children}</AppShell>
            </SavedListingsProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
