import type { NextConfig } from "next";

import { LEGACY_ROUTE_REDIRECTS } from "./src/core/navigation/legacyRouteRedirects";
import { apiFileImagePatterns } from "./src/core/config/apiFileImagePatterns";

const nextConfig: NextConfig = {
  // Standalone é para imagem Docker. A Vercel define VERCEL=1 e usa o próprio output.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  images: {
    remotePatterns: apiFileImagePatterns(process.env.NEXT_PUBLIC_API_URL),
  },
  // Sem isso o Next bloqueia /_next/* quando o celular acessa o dev server
  // pelo IP da rede local, o React não hidrata e os onClick não respondem.
  allowedDevOrigins: ["192.168.0.*", "192.168.*.*", "10.*.*.*"],
  // Arquivo lido em runtime pela página do PDF do livro.
  outputFileTracingIncludes: {
    "/historia/livro": ["./src/assets/**/*.pdf"],
  },
  // Pacotes CommonJS / browser-only usados só no cliente (modo estudo).
  serverExternalPackages: [
    "@music-i18n/musicxml-player",
    "opensheetmusicdisplay",
  ],
  async redirects() {
    return [...LEGACY_ROUTE_REDIRECTS];
  },
  async rewrites() {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) return [];
    const raw =
      process.env.NEXT_PUBLIC_API_URL?.trim() || "http://127.0.0.1:8080";
    let destination = "http://127.0.0.1:8080";
    try {
      const url = new URL(raw);
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1")
        return [];
      url.hostname = "127.0.0.1";
      destination = url.href.replace(/\/$/, "");
    } catch {
      return [];
    }
    return [
      {
        source: "/dev-api/:path*",
        destination: `${destination}/:path*`,
      },
    ];
  },
};

export default nextConfig;
