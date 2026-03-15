import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@logistics-erp/ui", "@logistics-erp/types"],
};

export default nextConfig;
