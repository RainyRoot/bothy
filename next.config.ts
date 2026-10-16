import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    // Pro Build neu — versioniert den Service Worker, damit jeder Deploy
    // die Offline-Caches des alten Builds verwirft (siehe public/sw.js)
    NEXT_PUBLIC_BUILD_ID: String(Date.now()),
  },
};

export default nextConfig;
