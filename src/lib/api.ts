import { getAccessToken } from '@/core/auth/accessToken';
import { getApiUrl, rewriteDevApiUrl } from '../config/environment';
import { failureMessage } from './userMessages';

function jsonHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  if (!merged.has('Content-Type')) {
    merged.set('Content-Type', 'application/json');
  }
  return merged;
}

export function apiAuthHeaders(headers?: HeadersInit): Headers {
  const merged = jsonHeaders(headers);
  const token = getAccessToken();
  if (token && !merged.has('Authorization')) {
    merged.set('Authorization', `Bearer ${token}`);
  }
  return merged;
}

/** GET de binários/XML em `/files/...` — a API valida visibilidade da música com o Bearer. */
export function fetchAuthedAsset(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(rewriteDevApiUrl(url), { ...init, headers });
}

/** Erro HTTP da API com o status, para a tela decidir o que fazer (ex.: 404 no login Google). */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function errorMessage(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text) as { error?: string };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    /* corpo que não é JSON */
  }
  return failureMessage(undefined, text || `Falha na API (${status}).`);
}

type ApiFetchOptions = RequestInit & {
  /** Endpoints públicos: não enviar Bearer (a API recusa a chave de senha se o login ainda exige troca). */
  skipAuth?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { skipAuth, ...requestInit } = options;
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      ...requestInit,
      headers: skipAuth ? jsonHeaders(requestInit.headers) : apiAuthHeaders(requestInit.headers),
    });
  } catch (caught) {
    throw new ApiError(failureMessage(caught, 'Falha de conexão com a API.'), 0);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(errorMessage(text, response.status), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
