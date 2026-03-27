import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  turbopack: {
    root: configDirectory,
  },
  async rewrites() {
    return [
      {
        source: "/calling",
        destination: "https://frontend-mtttt.vercel.app/auto-login",
      },
      {
        source: "/calling/:path*",
        destination: "https://frontend-mtttt.vercel.app/:path*",
      },
    ];
  },
};

export default nextConfig;
