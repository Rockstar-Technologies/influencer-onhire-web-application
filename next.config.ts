import type { NextConfig } from "next";

/**
 * Response headers for every page. Only protections that cannot break the application and need no deployment fact are set here:
 *  - nosniff, no framing, a minimal referrer, and no camera/microphone/location access;
 *  - the parts of a Content-Security-Policy that restrict where forms may post, what may embed this site and which plugins may run.
 *
 * NOT set here, because each needs a decision or a fact that does not exist in the repository (docs/DEPLOYMENT_READINESS.md, finding F-4):
 *  - `Strict-Transport-Security`: it commits the whole domain to https, so it is set where TLS ends once the domain is chosen;
 *  - the script/style/image sources of the Content-Security-Policy: they need a per-request nonce and the owner's list of allowed image hosts.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  // Do not announce the framework in every response.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export { SECURITY_HEADERS };
export default nextConfig;
