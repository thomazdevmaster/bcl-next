import { can, type Resource } from '@/core/auth/permissions';
import type { AccessRoles } from '@/core/auth/roles';
import { hasAuthenticatedRole } from '@/core/auth/roles';
import {
  GAME_CATEGORIES,
  gamesInCategory,
  getCategoryBySlug,
} from '@/domains/games/catalog';
import { roleSeesVisibility } from '@/domains/games/visibility';
import type {
  GameCatalogVisibility,
  GameCategoryDefinition,
  GameCategoryId,
  GameDefinition,
} from '@/domains/games/types';

export function canAccessGamesNav(roles: AccessRoles): boolean {
  return hasAuthenticatedRole(roles);
}

export function canManageGamesCatalog(
  roles: AccessRoles,
  permissions?: readonly string[] | null,
): boolean {
  return can(roles, 'games' as Resource, 'update', permissions);
}

export function visibleCategoriesForUser(
  roles: AccessRoles,
  catalog: GameCatalogVisibility,
): GameCategoryDefinition[] {
  return GAME_CATEGORIES.filter((category) =>
    roleSeesVisibility(roles, catalog.categories[category.id]),
  );
}

export function visibleCategoryForUser(
  roles: AccessRoles,
  slug: string,
  catalog: GameCatalogVisibility,
): GameCategoryDefinition | null {
  const category = getCategoryBySlug(slug);
  if (!category) return null;
  return roleSeesVisibility(roles, catalog.categories[category.id]) ? category : null;
}

export function visibleGamesInCategory(
  roles: AccessRoles,
  categoryId: GameCategoryId,
  catalog: GameCatalogVisibility,
): GameDefinition[] {
  const categoryVisible = roleSeesVisibility(roles, catalog.categories[categoryId]);
  if (!categoryVisible) return [];
  return gamesInCategory(categoryId).filter((game) => {
    const settings = catalog.games[game.id];
    if (!settings) return true;
    return roleSeesVisibility(roles, settings);
  });
}
