import type { NextConfig } from "next";

function apiFileImagePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "http", hostname: "localhost", port: "8080", pathname: "/files/**" },
    { protocol: "http", hostname: "127.0.0.1", port: "8080", pathname: "/files/**" },
    { protocol: "http", hostname: "192.168.0.*", port: "8080", pathname: "/files/**" },
  ];
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return patterns;
  try {
    const url = new URL(raw);
    if (!url.hostname || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return patterns;
    }
    patterns.push({
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/files/**",
    });
  } catch {
    /* URL inválida: só localhost */
  }
  return patterns;
}

const nextConfig: NextConfig = {
  // Standalone é para imagem Docker. A Vercel define VERCEL=1 e usa o próprio output.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  images: {
    remotePatterns: apiFileImagePatterns(),
  },
  // Sem isso o Next bloqueia /_next/* quando o celular acessa o dev server
  // pelo IP da rede local, o React não hidrata e os onClick não respondem.
  allowedDevOrigins: ["192.168.0.*", "192.168.*.*", "10.*.*.*"],
  // Arquivo lido em runtime pela página do PDF do livro.
  outputFileTracingIncludes: {
    "/historia/livro": ["./src/assets/**/*.pdf"],
  },
  // Pacotes CommonJS / browser-only usados só no cliente (modo estudo).
  serverExternalPackages: ["@music-i18n/musicxml-player", "opensheetmusicdisplay"],
  async rewrites() {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) return [];
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://127.0.0.1:8080";
    let destination = "http://127.0.0.1:8080";
    try {
      const url = new URL(raw);
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return [];
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
