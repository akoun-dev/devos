import type { NextConfig } from "next";

// DEBT-013 : headers de sécurité — CSP finalisée et testée (Task 26, séance post-AUDIT-003).
// Compromis documentés et assumés :
//  - script-src 'unsafe-inline' : bootstrap inline de Next (runtime RSC, dev overlay) ;
//    un nonce par requête exigerait un middleware — posture du projet : 0 middleware
//    (cf. ADR-003 / AUDIT-002) → resserrage explicitement différé ;
//  - script-src 'unsafe-eval' : requis par le runtime de développement (React Refresh / HMR) ;
//  - style-src 'unsafe-inline' : styles inline des composants Radix/shadcn/ui.
// Valeur ajoutée réelle : verrouillage des origines externes (scripts, frames, objets),
// anti-clickjacking (frame-ancestors), anti-injection base/form.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Aligné sur frame-ancestors 'none' (CSP fait foi dans les navigateurs modernes).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(), camera=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Content-Security-Policy", value: cspDirectives },
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
