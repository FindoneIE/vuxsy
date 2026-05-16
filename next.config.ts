import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "img.youtube.com",
    pathname: "/**",
  },
];

if (supabaseHostname) {
  remotePatterns.unshift({
    protocol: "https",
    hostname: supabaseHostname,
    pathname: "/storage/v1/object/public/**",
  });
}

const nextConfig: NextConfig = {
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 2,
  },
  images: {
    remotePatterns,
  },
  // Inline ALL imported CSS as <style> tags directly in the HTML <head>
  // instead of emitting an external render-blocking <link rel="stylesheet">.
  // This is the architectural fix for the first-paint white frame:
  // previously the browser had to download + parse the external stylesheet
  // before it could paint anything, so users saw Chrome's default white
  // viewport for ~150-220 ms before the page background, logo, and cards
  // appeared together (read as a "flash"). With CSS inlined the browser
  // parses styles as it parses the HTML and paints the correct background
  // + above-the-fold layout in the very first frame.
  //
  // `inlineCss` is the App Router-compatible flag in Next 16+
  // (`optimizeCss` only applies to the Pages Router).
  experimental: {
    inlineCss: true,
  },
};

export default nextConfig;