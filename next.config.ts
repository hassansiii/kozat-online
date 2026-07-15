import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit", "arabic-persian-reshaper", "bidi-js"],
  outputFileTracingIncludes: {
    "/api/admin/exams/[id]/export-pdf": [
      "./public/fonts/**/*",
      "./src/fonts/**/*",
    ],
  },
};

export default nextConfig;
