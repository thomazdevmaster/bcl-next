import {
  AUTHENTICATED_ROLES,
  type AccessRoles,
  type AuthenticatedRole,
} from '@/core/auth/roles';
import type { GameCatalogVisibility, GameVisibilitySettings } from '@/domains/games/types';

function activeAuthenticatedRoles(roles: AccessRoles): AuthenticatedRole[] {
  return roles.filter((role): role is AuthenticatedRole =>
    (AUTHENTICATED_ROLES as readonly string[]).includes(role),
  );
}

export function roleSeesVisibility(
  roles: AccessRoles,
  settings: GameVisibilitySettings,
): boolean {
  if (!settings.enabled) return false;
  const active = activeAuthenticatedRoles(roles);
  if (active.length === 0) return false;
  return active.some((role) => settings.visibleRoles.includes(role));
}

export function mergeCatalogWithDefaults(
  remote: Partial<GameCatalogVisibility> | null | undefined,
  defaults: GameCatalogVisibility,
): GameCatalogVisibility {
  const categories = { ...defaults.categories };
  if (remote?.categories) {
    for (const [key, value] of Object.entries(remote.categories)) {
      if (key in categories && value) {
        categories[key as keyof typeof categories] = {
          enabled: value.enabled ?? categories[key as keyof typeof categories].enabled,
          visibleRoles:
            value.visibleRoles?.length > 0
              ? value.visibleRoles
              : categories[key as keyof typeof categories].visibleRoles,
        };
      }
    }
  }
  const games = { ...defaults.games };
  if (remote?.games) {
    for (const [key, value] of Object.entries(remote.games)) {
      if (value) {
        games[key] = {
          enabled: value.enabled ?? games[key]?.enabled ?? true,
          visibleRoles:
            value.visibleRoles?.length > 0
              ? value.visibleRoles
              : (games[key]?.visibleRoles ?? defaults.games[key]?.visibleRoles ?? []),
        };
      }
    }
  }
  return { categories, games };
}
