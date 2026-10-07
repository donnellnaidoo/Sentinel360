import "@Sentinel360/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  // Stop `next dev` writing AGENTS.md / CLAUDE.md into apps/web.
  agentRules: false,
};

export default nextConfig;
