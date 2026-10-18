export const ROLES = ['public', 'amigos', 'aluno', 'musico', 'maestro', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  public: 'Público',
  amigos: 'Amigos',
  aluno: 'Aluno',
  musico: 'Músico',
  maestro: 'Maestro',
  admin: 'Administrador',
};

export const AUTHENTICATED_ROLES = ['amigos', 'aluno', 'musico', 'maestro', 'admin'] as const;
export type AuthenticatedRole = (typeof AUTHENTICATED_ROLES)[number];
export type AccessRoles = readonly string[];

export const PUBLIC_ROLES: AccessRoles = ['public'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function isPrivilegedRole(role: string): boolean {
  return role === 'admin' || role === 'maestro';
}

export function hasRole(roles: AccessRoles, role: string): boolean {
  return roles.includes(role);
}

export function roleLabels(roles: AccessRoles): string {
  return roles.map((role) => ROLE_LABEL[role as Role] ?? role).join(', ');
}
