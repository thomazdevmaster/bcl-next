import type { Action, Resource } from '@/core/auth/permissions';
import { can } from '@/core/auth/permissions';
import type { AccessRoles } from '@/core/auth/roles';
import { DOMAINS } from '@/domains/catalog';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const PUBLIC_NAV: NavItem[] = [
  { href: '/', label: 'Início', icon: 'home' },
  { href: '/agenda', label: 'Agenda', icon: 'event' },
  { href: '/blog', label: 'Blog', icon: 'article' },
  { href: '/sobre', label: 'Sobre', icon: 'info' },
  { href: '/historia', label: 'História', icon: 'auto_stories' },
];

const STUDY_NAV: NavItem = { href: '/study', label: 'Estudo', icon: 'school' };

const MANAGEMENT_NAV_SOURCE: Array<NavItem & { resource: Resource; action?: Action }> = [
  { href: '/gestao', label: 'Painel', icon: 'dashboard', resource: 'portal', action: 'read' },
  ...DOMAINS.filter((domain) => domain.navGroup === 'management').map((domain) => ({
    href: domain.path,
    label: domain.label,
    icon: domain.icon,
    resource: domain.id,
    action: 'read' as const,
  })),
];

export function getManagementNav(roles: AccessRoles, permissions?: readonly string[] | null): NavItem[] {
  const items = MANAGEMENT_NAV_SOURCE.filter((item) => can(roles, item.resource, item.action ?? 'read', permissions)).map(
    ({ href, label, icon }) => ({ href, label, icon }),
  );
  if (roles.some((role) => role !== 'public')) {
    const painel = items.findIndex((item) => item.href === '/gestao');
    items.splice(painel + 1, 0, STUDY_NAV);
  }
  if (roles.includes('admin')) {
    const painel = items.findIndex((item) => item.href === '/gestao');
    items.splice(painel + 1, 0, { href: '/gestao/papeis', label: 'Papéis', icon: 'admin_panel_settings' });
  }
  return items;
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
