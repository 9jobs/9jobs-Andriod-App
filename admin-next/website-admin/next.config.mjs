import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(appDir, "..");
const isDev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost:3001'],
  assetPrefix: '/admin/website-admin',
  outputFileTracingRoot: rootDir,
  poweredByHeader: false,
  turbopack: {
    root: rootDir,
    resolveAlias: {
      "next/dist/client/polyfills": "./empty-polyfill.js",
      "next/dist/build/polyfills/polyfill-module": "./empty-polyfill.js",
      "next/dist/build/polyfills/polyfill-nomodule": "./empty-polyfill.js",
    },
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.resolve.alias["next/dist/client/polyfills"] = path.resolve(appDir, "empty-polyfill.js");
      config.resolve.alias["next/dist/build/polyfills/polyfill-module"] = path.resolve(appDir, "empty-polyfill.js");
      config.resolve.alias["next/dist/build/polyfills/polyfill-nomodule"] = path.resolve(appDir, "empty-polyfill.js");
    }
    return config;
  },
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      ...(isDev ? [] : ["form-action 'self'"]),
      "frame-ancestors 'self'",
      "object-src 'none'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://assets.calendly.com`,
      "style-src 'self' 'unsafe-inline' https://assets.calendly.com https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://assets.calendly.com https://calendly.com",
      "frame-src 'self' https://calendly.com",
      "media-src 'self' blob: https:",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          ...(isDev ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    // The App-only service keeps the embedded Admin asset URLs unchanged.
    if (process.env.AGREEMENTS_SERVICE_MODE !== 'true') return [];

    return [
      {
        source: '/admin/website-admin/_next/:path*',
        destination: '/_next/:path*',
      },
    ];
  },
  async redirects() {
    return [
      // Core Service Redirects
      { source: "/resume-writing-services-australia", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/linkedin-optimization-australia", destination: "/services/linkedin-optimization", statusCode: 301 },
      { source: "/seek-profile-optimization", destination: "/services/seek-profile-optimization", statusCode: 301 },
      { source: "/job-application-services-australia", destination: "/services/job-application-automation", statusCode: 301 },
      { source: "/interview-support-australia", destination: "/services/interview-coaching", statusCode: 301 },
      { source: "/feature", destination: "/features", statusCode: 301 },

      // Melbourne Redirects
      { source: "/melbourne", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/get-jobs-in-melbourne", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/jobs-in-melbourne", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/careers-melbourne", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/jobs-melbourne", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/get-jobs-in-melbourne-vic", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/resume-melbourne", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/interview-coaching-melbourne", destination: "/services/interview-coaching", statusCode: 301 },
      { source: "/melbourne/get-jobs", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/melbourne/jobs", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/melbourne/careers", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/melbourne/resume", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/melbourne/interview-coaching", destination: "/services/interview-coaching", statusCode: 301 },
      { source: "/melbourne/jobs-melbourne", destination: "/jobs/melbourne", statusCode: 301 },
      { source: "/melbourne/get-jobs-vic", destination: "/jobs/melbourne", statusCode: 301 },

      // Sydney Redirects
      { source: "/sydney", destination: "/jobs/sydney", statusCode: 301 },
      { source: "/get-jobs-in-sydney-nsw", destination: "/jobs/sydney", statusCode: 301 },
      { source: "/jobs-in-sydney-nsw", destination: "/jobs/sydney", statusCode: 301 },
      { source: "/career-services-sydney-nsw", destination: "/jobs/sydney", statusCode: 301 },
      { source: "/resume-writer-sydney-nsw", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/interview-coaching-sydney-nsw", destination: "/services/interview-coaching", statusCode: 301 },
      { source: "/sydney/get-jobs", destination: "/jobs/sydney", statusCode: 301 },
      { source: "/sydney/jobs", destination: "/jobs/sydney", statusCode: 301 },
      { source: "/sydney/career-services", destination: "/jobs/sydney", statusCode: 301 },
      { source: "/sydney/resume-writer", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/sydney/interview-coaching", destination: "/services/interview-coaching", statusCode: 301 },

      // Brisbane Redirects
      { source: "/brisbane", destination: "/jobs/brisbane", statusCode: 301 },
      { source: "/get-jobs-in-brisbane-qld", destination: "/jobs/brisbane", statusCode: 301 },
      { source: "/jobs-in-brisbane-qld", destination: "/jobs/brisbane", statusCode: 301 },
      { source: "/resume-writer-brisbane-qld", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/brisbane/get-jobs", destination: "/jobs/brisbane", statusCode: 301 },
      { source: "/brisbane/jobs", destination: "/jobs/brisbane", statusCode: 301 },
      { source: "/brisbane/resume-writer", destination: "/services/resume-writing", statusCode: 301 },

      // Perth Redirects
      { source: "/perth", destination: "/jobs/perth", statusCode: 301 },
      { source: "/get-jobs-in-perth-wa", destination: "/jobs/perth", statusCode: 301 },
      { source: "/jobs-in-perth-wa", destination: "/jobs/perth", statusCode: 301 },
      { source: "/resume-writer-perth-wa", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/career-coaching-perth-wa", destination: "/services/interview-coaching", statusCode: 301 },
      { source: "/jobs-perth", destination: "/jobs/perth", statusCode: 301 },
      { source: "/jobs-in-perth", destination: "/jobs/perth", statusCode: 301 },
      { source: "/jobs-in-perth-wa-sourcing", destination: "/jobs/perth", statusCode: 301 },
      { source: "/perth/get-jobs", destination: "/jobs/perth", statusCode: 301 },
      { source: "/perth/jobs", destination: "/jobs/perth", statusCode: 301 },
      { source: "/perth/resume-writer", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/perth/career-coaching", destination: "/services/interview-coaching", statusCode: 301 },
      { source: "/perth/jobs-perth", destination: "/jobs/perth", statusCode: 301 },
      { source: "/perth/jobs-in-perth", destination: "/jobs/perth", statusCode: 301 },
      { source: "/perth/jobs-in-perth-wa", destination: "/jobs/perth", statusCode: 301 },

      // Adelaide Redirects
      { source: "/adelaide", destination: "/jobs/adelaide", statusCode: 301 },
      { source: "/get-jobs-in-adelaide-sa", destination: "/jobs/adelaide", statusCode: 301 },
      { source: "/jobs-in-adelaide-sa", destination: "/jobs/adelaide", statusCode: 301 },
      { source: "/adelaide/get-jobs", destination: "/jobs/adelaide", statusCode: 301 },
      { source: "/adelaide/jobs", destination: "/jobs/adelaide", statusCode: 301 },

      // Geelong Redirects
      { source: "/geelong", destination: "/jobs/geelong", statusCode: 301 },
      { source: "/jobs-in-geelong-vic", destination: "/jobs/geelong", statusCode: 301 },
      { source: "/resume-help-geelong-vic", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/career-coaching-geelong-vic", destination: "/services/interview-coaching", statusCode: 301 },
      { source: "/geelong/jobs", destination: "/jobs/geelong", statusCode: 301 },
      { source: "/geelong/resume-help", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/geelong/career-coaching", destination: "/services/interview-coaching", statusCode: 301 },

      // Victoria Redirects
      { source: "/vic", destination: "/jobs/vic", statusCode: 301 },
      { source: "/jobs-in-vic", destination: "/jobs/vic", statusCode: 301 },
      { source: "/resume-help-vic", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/career-coaching-vic", destination: "/services/interview-coaching", statusCode: 301 },
      { source: "/vic/jobs", destination: "/jobs/vic", statusCode: 301 },
      { source: "/vic/resume-help", destination: "/services/resume-writing", statusCode: 301 },
      { source: "/vic/career-coaching", destination: "/services/interview-coaching", statusCode: 301 },

      // Apex Redirect
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.9jobs.co",
          },
        ],
        destination: "https://9jobs.co/:path*",
        statusCode: 301,
      },
    ];
  },
};

export default nextConfig;
