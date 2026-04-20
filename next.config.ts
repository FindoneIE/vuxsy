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
};

export default nextConfig;