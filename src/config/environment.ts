/** API oficial usada pelo frontend publicado. */
const PRODUCTION_API_URL = 'https://api.bandacarmelitana.org';
const DEVELOPMENT_API_URL = 'http://127.0.0.1:8080';

function isHostedProduction(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

/** Origem pública do site — necessária para og:image absoluto no WhatsApp. */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (explicit) return new URL(explicit);
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) return new URL(`https://${vercelProd}`);
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);
  const port = process.env.PORT ?? '3000';
  return new URL(`http://localhost:${port}`);
}

function pageIsLanDev(): boolean {
  return typeof window !== 'undefined' && /^192\.168\.0\.\d{1,3}$/.test(window.location.hostname);
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * No celular a página abre em 192.168.0.x:3000. A API continua em localhost:8080
 * nesta máquina, então o telefone fala só com a porta 3000 e o Next encaminha.
 */
export function rewriteDevApiUrl(url: string): string {
  if (!pageIsLanDev()) return url;
  try {
    const parsed = new URL(url, window.location.origin);
    if (!isLoopbackHost(parsed.hostname)) return url;
    return `${window.location.origin}/dev-api${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function apiUrlFromPage(configured: string): string {
  if (!pageIsLanDev()) return configured;
  try {
    const api = new URL(configured);
    if (isLoopbackHost(api.hostname)) {
      return `${window.location.origin}/dev-api`;
    }
  } catch {
    /* mantém a URL configurada */
  }
  return configured;
}

/** URL única da API, compartilhada pelo módulo de estudo. */
export function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return apiUrlFromPage(configured);
  return isHostedProduction() ? PRODUCTION_API_URL : DEVELOPMENT_API_URL;
}
