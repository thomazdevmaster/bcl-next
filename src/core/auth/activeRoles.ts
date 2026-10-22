import { defaultPermissionsForCode } from '@/core/auth/rolesCatalog';
import type { AccessRoles } from '@/core/auth/roles';

const STORAGE_PREFIX = 'app.auth.activeRoles.';

function storageKey(userId: string | number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadStoredActiveRoles(userId: string | number, accountRoles: AccessRoles): AccessRoles {
  if (typeof window === 'undefined') return accountRoles;
  const allowed = new Set(accountRoles);
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return accountRoles;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return accountRoles;
    const picked = parsed.filter((role): role is string => typeof role === 'string' && allowed.has(role));
    return picked.length > 0 ? picked : accountRoles;
  } catch {
    return accountRoles;
  }
}

export function persistActiveRoles(userId: string | number, activeRoles: AccessRoles): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(userId), JSON.stringify([...activeRoles]));
}

export function filterPermissionsForActiveRoles(
  accountPermissions: readonly string[] | null | undefined,
  activeRoles: AccessRoles,
  permissionsByRole?: Readonly<Record<string, readonly string[]>> | null,
): readonly string[] | null {
  if (activeRoles.includes('admin')) {
    return accountPermissions?.length ? accountPermissions : null;
  }

  if (permissionsByRole && Object.keys(permissionsByRole).length > 0) {
    const merged = new Set<string>();
    activeRoles.forEach((role) => {
      permissionsByRole[role]?.forEach((key) => merged.add(key));
    });
    return merged.size > 0 ? [...merged] : null;
  }

  if (!accountPermissions || accountPermissions.length === 0) return null;
  const allowed = new Set<string>();
  activeRoles.forEach((role) => {
    defaultPermissionsForCode(role).forEach((key) => allowed.add(key));
  });
  const filtered = accountPermissions.filter((key) => allowed.has(key));
  return filtered.length > 0 ? filtered : null;
}

export function normalizeActiveRoles(next: AccessRoles, accountRoles: AccessRoles): AccessRoles {
  const allowed = new Set(accountRoles);
  const picked = next.filter((role) => allowed.has(role));
  return picked.length > 0 ? picked : [...accountRoles];
}
