import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Có package-lock.json ở thư mục home; ghim root về thư mục dự án để Next
  // không chọn nhầm workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
