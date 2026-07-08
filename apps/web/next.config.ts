import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://172.20.10.3:3000"],
  transpilePackages: ["@kicker-board/shared"]
};

export default nextConfig;
