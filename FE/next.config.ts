import type { NextConfig } from "next";

/**
 * Khi không dùng `NEXT_PUBLIC_API_BASE_URL` để trỏ thẳng Express,
 * các request Same-Origin `/api/*` được proxy xuống backend (xem `src/lib/api.ts`).
 */
const backendUrl =
  process.env.BACKEND_PROXY_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
