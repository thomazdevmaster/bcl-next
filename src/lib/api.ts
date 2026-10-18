import { getAccessToken } from '@/core/auth/accessToken';
import { getApiUrl } from '../config/environment';
import { failureMessage } from './userMessages';

export function apiAuthHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  if (!merged.has('Content-Type')) {
    merged.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token && !merged.has('Authorization')) {
    merged.set('Authorization', `Bearer ${token}`);
  }
  return merged;
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

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, {
      ...options,
      headers: apiAuthHeaders(options.headers),
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
