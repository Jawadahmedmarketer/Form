import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/**": ["./src/assets/**/*"],
  },
};

export default nextConfig;
