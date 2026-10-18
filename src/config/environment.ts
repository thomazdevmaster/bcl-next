/**
 * Em produção (Vercel) o site fala só com a API Spring.
 * O mock `/bcl-api` existe apenas no desenvolvimento local.
 */
const PRODUCTION_API_URL = 'https://api.bandacarmelitana.org';

function isHostedProduction(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

export function usesRemoteApi(): boolean {
  if (isHostedProduction()) return true;
  if (process.env.NEXT_PUBLIC_USE_REMOTE_API === 'true') return true;
  if (process.env.NEXT_PUBLIC_USE_REMOTE_API === 'false') return false;
  const url = process.env.NEXT_PUBLIC_API_URL?.trim() ?? '';
  return url.length > 0 && !url.includes('/bcl-api');
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

function embeddedMockBase(): string {
  const port = process.env.PORT ?? '3000';
  return `http://127.0.0.1:${port}/bcl-api`;
}

/** URL única da API, compartilhada pelo módulo de estudo. */
export function getApiUrl(): string {
  if (!usesRemoteApi()) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/bcl-api`;
    }
    return embeddedMockBase();
  }
  const url = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (url && !url.includes('/bcl-api')) return url;
  return PRODUCTION_API_URL;
}
