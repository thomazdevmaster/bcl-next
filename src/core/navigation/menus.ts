import type { Action, Resource } from '@/core/auth/permissions';
import { can } from '@/core/auth/permissions';
import type { AccessRoles } from '@/core/auth/roles';
import { DOMAINS } from '@/domains/catalog';
import {
  canAccessStudyModule,
  shouldShowSongsManagementNav,
} from '@/domains/songs/songAccess';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export type AuthenticatedNavGroupId = 'public' | 'logged' | 'management';

export interface AuthenticatedNavGroup {
  id: AuthenticatedNavGroupId;
  label: string;
  items: NavItem[];
}

export const PUBLIC_NAV: NavItem[] = [
  { href: '/', label: 'Início', icon: 'home' },
  { href: '/agenda', label: 'Agenda', icon: 'event' },
  { href: '/blog', label: 'Blog', icon: 'article' },
  { href: '/sobre', label: 'Sobre', icon: 'info' },
  { href: '/historia', label: 'História', icon: 'auto_stories' },
];

const STUDY_NAV: NavItem = { href: '/study', label: 'Estudo', icon: 'school' };
const SONGS_NAV: NavItem = { href: '/gestao/musicas', label: 'Músicas', icon: 'library_music' };
const ROLES_NAV: NavItem = { href: '/gestao/papeis', label: 'Papéis', icon: 'admin_panel_settings' };

const MANAGEMENT_NAV_SOURCE: Array<NavItem & { resource: Resource; action?: Action }> = [
  { href: '/gestao', label: 'Painel', icon: 'dashboard', resource: 'portal', action: 'read' },
  ...DOMAINS.filter((domain) => domain.navGroup === 'management' && domain.id !== 'songs').map((domain) => ({
    href: domain.path,
    label: domain.label,
    icon: domain.icon,
    resource: domain.id,
    action: 'read' as const,
  })),
];

function getManagementModuleItems(roles: AccessRoles, permissions?: readonly string[] | null): NavItem[] {
  const items = MANAGEMENT_NAV_SOURCE.filter((item) => can(roles, item.resource, item.action ?? 'read', permissions)).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );
  if (roles.includes('admin')) {
    const painel = items.findIndex((item) => item.href === '/gestao');
    items.splice(painel + 1, 0, ROLES_NAV);
  }
  return items;
}

/** Lista plana para o painel `/gestao` (inclui Estudo junto aos módulos). */
function getMyAreaItems(roles: AccessRoles, permissions?: readonly string[] | null): NavItem[] {
  const items: NavItem[] = [];
  if (canAccessStudyModule(roles, permissions)) {
    items.push(STUDY_NAV);
  }
  if (shouldShowSongsManagementNav(roles, permissions)) {
    items.push(SONGS_NAV);
  }
  return items;
}

export function getManagementNav(roles: AccessRoles, permissions?: readonly string[] | null): NavItem[] {
  const items = getManagementModuleItems(roles, permissions);
  const myArea = getMyAreaItems(roles, permissions);
  if (myArea.length > 0) {
    const painel = items.findIndex((item) => item.href === '/gestao');
    items.splice(painel + 1, 0, ...myArea);
  }
  return items;
}

/** Grupos rotulados para o menu lateral autenticado (`AppShell`). */
export function getAuthenticatedNavGroups(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): AuthenticatedNavGroup[] {
  const groups: AuthenticatedNavGroup[] = [{ id: 'public', label: '', items: [...PUBLIC_NAV] }];

  const myArea = getMyAreaItems(roles, permissions);
  if (myArea.length > 0) {
    groups.push({ id: 'logged', label: 'Minha Área', items: myArea });
  }

  const managementItems = getManagementModuleItems(roles, permissions);
  if (managementItems.length > 0) {
    groups.push({ id: 'management', label: 'Gestão', items: managementItems });
  }

  return groups;
}

export function titleForPath(pathname: string): string {
  const path = pathname.split('?')[0];
  const match = [...PUBLIC_NAV, ...MANAGEMENT_NAV_SOURCE].find(
    (item) => item.href === path || (item.href !== '/' && path.startsWith(item.href)),
  );
  if (match) return match.label;
  if (path.startsWith('/gestao/papeis')) return 'Papéis';
  if (path === '/alterar-senha') return 'Alterar senha';
  if (path === '/cadastro') return 'Cadastro';
  if (path === '/esqueci-senha') return 'Esqueci a senha';
  if (path === '/login') return 'Entrar';
  if (path === '/profile') return 'Meu perfil';
  if (path === '/settings') return 'Configurações';
  if (path.startsWith('/study')) return 'Estudo';
  return 'Banda Carmelitana';
}
