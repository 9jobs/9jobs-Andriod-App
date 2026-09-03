import type { NextConfig } from "next";

// Keep the source Vite environment file intact while exposing its existing
// browser-safe values through the Next.js names used by the migrated client.
const agreementsServiceUrl = (process.env.AGREEMENTS_SERVICE_URL || "http://127.0.0.1:3003").replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.VITE_BACKEND_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  },
  async rewrites() {
    return [
      {
        source: "/admin/website-admin/_next/:path*",
        destination: `${agreementsServiceUrl}/admin/website-admin/_next/:path*`,
      },
      {
        source: "/admin/website-admin/api/:path*",
        destination: `${agreementsServiceUrl}/api/:path*`,
      },
      {
        source: "/admin/website-admin",
        destination: `${agreementsServiceUrl}/admin`,
      },
      {
        source: "/admin/website-admin/:path*",
        destination: `${agreementsServiceUrl}/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
