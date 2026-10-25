import type { NextConfig } from "next";

// DEBT-013 : headers de sécurité (CSP documentée comme travail restant — ajout
// prudent reporté pour ne pas casser le rendu inline de Next/shadcn, cf. AUDIT-002)
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(), camera=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // DEBT-004 : les erreurs TypeScript font désormais échouer le build
  typescript: {
    ignoreBuildErrors: false,
  },
  // DEBT-005 : détection des effets impurs / doubles rendus réactivée
  reactStrictMode: true,
  // DEBT-013 : ne plus exposer la stack
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
