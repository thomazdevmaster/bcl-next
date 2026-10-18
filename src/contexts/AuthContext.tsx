"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { setAccessToken, getAccessToken, usesRemoteApi } from '@/core/auth/accessToken';
import { findDemoUser } from '@/core/auth/demoUsers';
import { apiFetch } from '@/lib/api';
import { sealPassword } from '@/lib/passwordCipher';
import { failureMessage } from '@/lib/userMessages';
import { PUBLIC_ROLES, type AccessRoles } from '@/core/auth/roles';
import type { AppUser } from '@/domains/users/types';

const AUTH_USER_KEY = 'app.auth.user';
const AUTH_KEEP_LOGGED_KEY = 'app.auth.keepLoggedIn';

export type SessionUser = AppUser & { permissions?: string[] };

type AuthContextValue = {
  user: SessionUser | null;
  isHydrated: boolean;
  isLoggedIn: boolean;
  roles: AccessRoles;
  permissions: readonly string[] | null;
  displayName: string | null;
  /** `identifier` aceita nome de usuário ou e-mail. */
  login: (identifier: string, password: string, keepLoggedIn: boolean) => Promise<SessionUser>;
  /** `credential` é o ID token do Google Identity Services. Só com a API Spring. */
  loginWithGoogle: (credential: string, keepLoggedIn: boolean) => Promise<SessionUser>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<SessionUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const subscribeToHydration = () => () => undefined;

function persist(user: SessionUser | null, keepLoggedIn: boolean) {
  if (typeof window === 'undefined') return;
  if (user && keepLoggedIn) {
    localStorage.setItem(AUTH_KEEP_LOGGED_KEY, 'true');
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return;
  }
  localStorage.removeItem(AUTH_KEEP_LOGGED_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

type LoginPayload = {
  token: string;
  user: SessionUser;
};

function restoreUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const keep = localStorage.getItem(AUTH_KEEP_LOGGED_KEY) === 'true';
  if (!keep) return null;
  if (usesRemoteApi() && !localStorage.getItem('app.auth.token')) return null;
  const stored = localStorage.getItem(AUTH_USER_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<SessionUser>;
    const roles = Array.isArray(parsed.roles)
      ? parsed.roles.filter((role): role is string => typeof role === 'string' && /^[a-z][a-z0-9_]{1,31}$/.test(role))
      : [];
    if (roles.length === 0) return null;
    return { ...parsed, roles } as SessionUser;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => restoreUser());
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const login = useCallback(async (identifier: string, password: string, keepLoggedIn: boolean) => {
    if (usesRemoteApi()) {
      // A senha nunca vai em claro: é cifrada com a chave pública da API.
      const sealed = await sealPassword(password);
      const session = await apiFetch<LoginPayload>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: identifier.trim(), password: sealed, keepLoggedIn }),
      });
      setAccessToken(session.token, keepLoggedIn);
      setUser(session.user);
      persist(session.user, keepLoggedIn);
      return session.user;
    }
    const found = findDemoUser(identifier, password);
    if (!found) {
      throw new Error('Usuário ou senha inválidos.');
    }
    setUser(found);
    persist(found, keepLoggedIn);
    return found;
  }, []);

  const loginWithGoogle = useCallback(async (credential: string, keepLoggedIn: boolean) => {
    if (!usesRemoteApi()) {
      throw new Error(failureMessage(undefined, 'Entrar com Google só funciona com a API conectada.'));
    }
    const session = await apiFetch<LoginPayload>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential, keepLoggedIn }),
    });
    setAccessToken(session.token, keepLoggedIn);
    setUser(session.user);
    persist(session.user, keepLoggedIn);
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    setAccessToken(null, false);
    setUser(null);
    persist(null, false);
  }, []);

  useEffect(() => {
    if (!usesRemoteApi() || !getAccessToken()) return;
    let active = true;
    apiFetch<SessionUser>('/auth/me')
      .then((me) => {
        if (!active) return;
        setUser(me);
        if (localStorage.getItem(AUTH_KEEP_LOGGED_KEY) === 'true') {
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(me));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const updateProfile = useCallback((patch: Partial<SessionUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      if (localStorage.getItem(AUTH_KEEP_LOGGED_KEY) === 'true') {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => {
      const hydratedUser = isHydrated ? user : null;
      return {
        user: hydratedUser,
        isHydrated,
        isLoggedIn: hydratedUser !== null,
        roles: hydratedUser?.roles ?? PUBLIC_ROLES,
        permissions: hydratedUser?.permissions ?? null,
        displayName: hydratedUser ? hydratedUser.name.split(' ')[0] : null,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
      };
    },
    [isHydrated, user, login, loginWithGoogle, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
