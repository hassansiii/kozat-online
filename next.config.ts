import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "arabic-persian-reshaper", "bidi-js"],
};

export default nextConfig;
