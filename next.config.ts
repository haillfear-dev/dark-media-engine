import type { NextConfig } from "next";
const config: NextConfig = { experimental: { serverActions: { bodySizeLimit: "2mb" } } };
export default config;
