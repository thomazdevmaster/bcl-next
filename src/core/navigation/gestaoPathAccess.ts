import { can, type Action, type Resource } from '@/core/auth/permissions';
import type { AccessRoles } from '@/core/auth/roles';
import { hasRole } from '@/core/auth/roles';
import { DOMAINS } from '@/domains/catalog';
import { canAccessSongsModule } from '@/domains/songs/songAccess';

type PermissionRule = { resource: Resource; action: Action };

export type GestaoPathAccess =
  | { kind: 'allow' }
  | { kind: 'deny'; resource: Resource; action: Action }
  | { kind: 'deny-admin' }
  | { kind: 'deny-unknown' };

/** Conta de acesso — não confundir com `/gestao/pessoas` (cadastro de integrantes). */
const USUARIOS_ACCESS: PermissionRule[] = [
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'approve' },
  { resource: 'users', action: 'create' },
  { resource: 'users', action: 'update' },
];

function normalizePath(pathname: string): string {
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  return path;
}

function matchesGestaoSubpath(path: string, base: string): boolean {
  return path === base || path.startsWith(`${base}/`);
}

function gestaoPermissionRule(path: string): GestaoPathAccess | null {
  if (path === '/gestao') {
    return { kind: 'allow' };
  }

  if (matchesGestaoSubpath(path, '/gestao/papeis')) {
    return { kind: 'deny-admin' };
  }

  if (path === '/gestao/midias/novo') {
    return { kind: 'deny', resource: 'media', action: 'create' };
  }

  if (/^\/gestao\/midias\/[^/]+$/.test(path) && path !== '/gestao/midias/novo') {
    return { kind: 'deny', resource: 'media', action: 'update' };
  }

  if (matchesGestaoSubpath(path, '/gestao/midias')) {
    return { kind: 'deny', resource: 'media', action: 'read' };
  }

  if (matchesGestaoSubpath(path, '/gestao/blog')) {
    return { kind: 'deny', resource: 'blogpage', action: 'update' };
  }

  if (matchesGestaoSubpath(path, '/gestao/home')) {
    return { kind: 'deny', resource: 'homepage', action: 'update' };
  }

  if (matchesGestaoSubpath(path, '/gestao/musicas')) {
    return { kind: 'deny', resource: 'songs', action: 'read' };
  }

  if (matchesGestaoSubpath(path, '/gestao/usuarios')) {
    return { kind: 'deny', resource: 'users', action: 'read' };
  }

  for (const domain of DOMAINS) {
    if (domain.navGroup !== 'management') continue;
    if (['media', 'songs', 'users', 'blogpage', 'homepage'].includes(domain.id)) continue;
    if (matchesGestaoSubpath(path, domain.path)) {
      return { kind: 'deny', resource: domain.id, action: 'read' };
    }
  }

  if (path.startsWith('/gestao/')) {
    return { kind: 'deny-unknown' };
  }

  return null;
}

function isAllowed(
  access: GestaoPathAccess,
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  if (access.kind === 'allow') return true;
  if (access.kind === 'deny-unknown') return false;
  if (access.kind === 'deny-admin') return hasRole(roles, 'admin');

  if (access.resource === 'songs' && access.action === 'read') {
    return canAccessSongsModule(roles, permissions);
  }

  if (access.resource === 'users' && access.action === 'read') {
    return USUARIOS_ACCESS.some((rule) => can(roles, rule.resource, rule.action, permissions));
  }

  return can(roles, access.resource, access.action, permissions);
}

/** Avalia se a rota em `/gestao` pode ser aberta com os papéis ativos (deep links). */
export function resolveGestaoPathAccess(
  pathname: string,
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): GestaoPathAccess & { allowed: boolean } {
  const path = normalizePath(pathname);
  const rule = gestaoPermissionRule(path);
  if (!rule) {
    return { kind: 'allow', allowed: true };
  }
  return { ...rule, allowed: isAllowed(rule, roles, permissions) };
}
