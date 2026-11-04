import type { NextConfig } from "next";

type RemotePatterns = NonNullable<NextConfig["images"]>["remotePatterns"];

export function apiFileImagePatterns(rawApiUrl?: string): RemotePatterns {
  const patterns: RemotePatterns = [
    { protocol: "http", hostname: "localhost", port: "8080", pathname: "/files/**" },
    { protocol: "http", hostname: "127.0.0.1", port: "8080", pathname: "/files/**" },
    { protocol: "http", hostname: "192.168.0.*", port: "8080", pathname: "/files/**" },
  ];
  const raw = rawApiUrl?.trim();
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
    // URL inválida: mantém somente os padrões locais.
  }
  return patterns;
}
