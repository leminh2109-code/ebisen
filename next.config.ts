import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Có package-lock.json ở thư mục home; ghim root về thư mục dự án để Next
  // không chọn nhầm workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Trang Tài liệu upload file qua server action — mặc định Next.js chỉ 1MB.
  serverActions: {
    bodySizeLimit: '52mb',
  },
};

export default nextConfig;
