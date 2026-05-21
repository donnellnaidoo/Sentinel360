import "@Sentinel360/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  async rewrites() {
    return {
      beforeFiles: [
        // Proxy /api/* to AI service or Node server
        {
          source: "/api/:path*",
          destination: `${process.env.AI_SERVICE_URL || "http://localhost:8000"}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
