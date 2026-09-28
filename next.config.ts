import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects() {
    return [
      // The log-in page used to live at /sign-in; keep old links working.
      { source: "/sign-in", destination: "/login", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;