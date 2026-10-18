import type { AccessRoles, Role } from './roles';
import { hasRole, isPrivilegedRole } from './roles';

export const RESOURCES = [
  'portal',
  'users',
  'people',
  'songs',
  'patrimony',
  'instruments',
  'presentations',
  'media',
  'homepage',
  'blogpage',
] as const;

export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = ['read', 'create', 'update', 'delete', 'read_members', 'view_sensitive', 'approve', 'manage_roles', 'assign_admin'] as const;
export type Action = (typeof ACTIONS)[number];

export type Permission = `${Resource}:${Action}`;

/** Domínios com formulário genérico. A home tem editor próprio. */
export type CrudResource = Exclude<Resource, 'portal' | 'homepage' | 'blogpage'>;

export type PeopleReadScope = 'none' | 'students' | 'members';

export const ACTION_LABEL: Record<Action, string> = {
  read: 'Ver',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir',
  read_members: 'Ver membros',
  view_sensitive: 'Ver dados sensíveis',
  approve: 'Aprovar',
  manage_roles: 'Gerir papéis',
  assign_admin: 'Atribuir administrador',
};

const FULL_CRUD: Action[] = ['read', 'create', 'update', 'delete'];

const ROLE_ACTIONS: Record<Role, Partial<Record<Resource, Action[]>>> = {
  public: {
    portal: ['read'],
  },
  amigos: {
    portal: ['read'],
  },
  aluno: {
    portal: ['read'],
    songs: ['read'],
    instruments: ['read'],
    people: ['read'],
    presentations: ['read'],
  },
  musico: {
    portal: ['read'],
    songs: ['read'],
    patrimony: ['read'],
    instruments: ['read'],
    people: ['read', 'read_members'],
    presentations: ['read'],
  },
  maestro: {
    portal: ['read'],
    media: FULL_CRUD,
    songs: FULL_CRUD,
    patrimony: FULL_CRUD,
    instruments: FULL_CRUD,
    people: [...FULL_CRUD, 'read_members', 'view_sensitive'],
    presentations: FULL_CRUD,
    users: FULL_CRUD,
  },
  admin: {
    portal: ['read'],
    media: FULL_CRUD,
    songs: FULL_CRUD,
    patrimony: FULL_CRUD,
    instruments: FULL_CRUD,
    people: [...FULL_CRUD, 'read_members', 'view_sensitive'],
    presentations: FULL_CRUD,
    users: FULL_CRUD,
    homepage: ['read', 'update'],
    blogpage: ['read', 'update'],
  },
};

export function permissionKeysForRole(role: string): string[] {
  const grants = ROLE_ACTIONS[role as Role];
  if (!grants) return [];
  return Object.entries(grants).flatMap(([resource, actions]) =>
    (actions ?? []).map((action) => `${resource}:${action}`),
  );
}

export function can(
  roles: AccessRoles,
  resource: Resource,
  action: Action,
  permissions?: readonly string[] | null,
): boolean {
  if (hasRole(roles, 'admin')) return true;
  if (permissions) return permissions.includes(`${resource}:${action}`);
  return roles.some((role) => {
    const grants = ROLE_ACTIONS[role as Role];
    return grants?.[resource]?.includes(action) ?? false;
  });
}

export function peopleReadScope(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): PeopleReadScope {
  if (permissions || hasRole(roles, 'admin')) {
    if (hasRole(roles, 'admin') || permissions?.includes('people:read_members')) return 'members';
    if (permissions?.includes('people:read')) return 'students';
    if (!permissions) {
      return roles.some((role) => role === 'musico' || isPrivilegedRole(role)) ? 'members' : 'none';
    }
    return 'none';
  }
  if (roles.some((role) => role === 'musico' || isPrivilegedRole(role))) return 'members';
  if (hasRole(roles, 'aluno')) return 'students';
  return 'none';
}

export function shouldMaskSensitivePersonData(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  if (hasRole(roles, 'admin')) return false;
  if (permissions) return !permissions.includes('people:view_sensitive');
  if (roles.some(isPrivilegedRole)) return false;
  return hasRole(roles, 'aluno') || hasRole(roles, 'musico');
}

export function canAssignRole(actorRoles: AccessRoles): boolean {
  return hasRole(actorRoles, 'admin');
}
