import { usesRemoteApi } from '@/config/environment';

export { usesRemoteApi };

export const TOKEN_KEY = 'app.auth.token';

let memoryToken: string | null = null;

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function getAccessToken(): string | null {
  if (memoryToken) return memoryToken;
  memoryToken = readStoredToken();
  return memoryToken;
}

export function setAccessToken(token: string | null, keepLoggedIn: boolean) {
  memoryToken = token;
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (!token) return;
  const store = keepLoggedIn ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
}
