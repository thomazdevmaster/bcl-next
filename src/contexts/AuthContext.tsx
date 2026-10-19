"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setAccessToken, getAccessToken, usesRemoteApi } from '@/core/auth/accessToken';
import { findDemoUser } from '@/core/auth/demoUsers';
import { ApiError, apiFetch } from '@/lib/api';
import { sealPassword } from '@/lib/passwordCipher';
import { failureMessage } from '@/lib/userMessages';
import {
  filterPermissionsForActiveRoles,
  loadStoredActiveRoles,
  normalizeActiveRoles,
  persistActiveRoles,
} from '@/core/auth/activeRoles';
import { PUBLIC_ROLES, type AccessRoles } from '@/core/auth/roles';
import type { AppUser } from '@/domains/users/types';

const AUTH_USER_KEY = 'app.auth.user';
const AUTH_KEEP_LOGGED_KEY = 'app.auth.keepLoggedIn';

export type SessionUser = AppUser & { permissions?: string[] };

type AuthContextValue = {
  user: SessionUser | null;
  isHydrated: boolean;
  isLoggedIn: boolean;
  /** Papéis efetivos na sessão (menu e permissões). */
  roles: AccessRoles;
  /** Todos os papéis da conta. */
  accountRoles: AccessRoles;
  /** Subconjunto escolhido pelo usuário quando há mais de um papel. */
  activeRoles: AccessRoles;
  permissions: readonly string[] | null;
  displayName: string | null;
  setActiveRoles: (roles: AccessRoles) => void;
  /** `identifier` aceita nome de usuário ou e-mail. */
  login: (identifier: string, password: string, keepLoggedIn: boolean) => Promise<SessionUser>;
  /** `credential` é o ID token do Google Identity Services. Só com a API Spring. */
  loginWithGoogle: (credential: string, keepLoggedIn: boolean) => Promise<SessionUser>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<SessionUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(user: SessionUser | null, keepLoggedIn: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEEP_LOGGED_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  if (!user) return;
  if (keepLoggedIn) localStorage.setItem(AUTH_KEEP_LOGGED_KEY, 'true');
  const store = keepLoggedIn ? localStorage : sessionStorage;
  store.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function parseStoredUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    const roles = Array.isArray(parsed.roles)
      ? parsed.roles.filter((role): role is string => typeof role === 'string' && /^[a-z][a-z0-9_]{1,31}$/.test(role))
      : [];
    if (roles.length === 0) return null;
    return { ...parsed, roles } as SessionUser;
  } catch {
    return null;
  }
}

/** Lê a sessão do storage. `sessionStorage` cobre F5 sem “manter conectado”. */
function restoreUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_USER_KEY) ?? sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  if (usesRemoteApi() && !getAccessToken()) {
    return null;
  }
  const user = parseStoredUser(raw);
  if (!user) {
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  }
  return user;
}

function keptLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(AUTH_KEEP_LOGGED_KEY) === 'true') return true;
  return Boolean(localStorage.getItem(AUTH_USER_KEY));
}

type LoginPayload = {
  token: string;
  user: SessionUser;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [activeRoles, setActiveRolesState] = useState<AccessRoles>(PUBLIC_ROLES);
  const [isHydrated, setIsHydrated] = useState(false);

  useLayoutEffect(() => {
    getAccessToken();
    setUser(restoreUser());
    setIsHydrated(true);
  }, []);

  const login = useCallback(async (identifier: string, password: string, keepLoggedIn: boolean) => {
    if (usesRemoteApi()) {
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
    setActiveRolesState(PUBLIC_ROLES);
    persist(null, false);
  }, []);

  useEffect(() => {
    if (!user) {
      setActiveRolesState(PUBLIC_ROLES);
      return;
    }
    setActiveRolesState(loadStoredActiveRoles(user.id, user.roles));
  }, [user]);

  const setActiveRoles = useCallback(
    (next: AccessRoles) => {
      if (!user) return;
      const normalized = normalizeActiveRoles(next, user.roles);
      setActiveRolesState(normalized);
      persistActiveRoles(user.id, normalized);
    },
    [user],
  );

  useEffect(() => {
    if (!isHydrated || !usesRemoteApi() || !getAccessToken()) return;
    let active = true;
    apiFetch<SessionUser>('/auth/me')
      .then((me) => {
        if (!active) return;
        setUser(me);
        persist(me, keptLoggedIn());
      })
      .catch((caught: unknown) => {
        if (!active) return;
        if (caught instanceof ApiError && caught.status === 401) {
          setAccessToken(null, false);
          setUser(null);
          persist(null, false);
        }
      });
    return () => {
      active = false;
    };
  }, [isHydrated]);

  const updateProfile = useCallback((patch: Partial<SessionUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      persist(next, keptLoggedIn());
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => {
      const hydratedUser = isHydrated ? user : null;
      const accountRoles = hydratedUser?.roles ?? PUBLIC_ROLES;
      const effectiveRoles = hydratedUser ? activeRoles : PUBLIC_ROLES;
      const permissions = hydratedUser
        ? filterPermissionsForActiveRoles(hydratedUser.permissions, effectiveRoles)
        : null;
      return {
        user: hydratedUser,
        isHydrated,
        isLoggedIn: hydratedUser !== null,
        roles: effectiveRoles,
        accountRoles,
        activeRoles: effectiveRoles,
        permissions,
        displayName: hydratedUser ? hydratedUser.name.split(' ')[0] : null,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
        setActiveRoles,
      };
    },
    [isHydrated, user, activeRoles, login, loginWithGoogle, logout, updateProfile, setActiveRoles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
