import type { AuthenticatedRole } from '@/core/auth/roles';

export const GAME_CATEGORY_IDS = [
  'notas',
  'ritmos',
  'intervalos',
  'escalas',
  'instrumentos',
] as const;

export type GameCategoryId = (typeof GAME_CATEGORY_IDS)[number];

export interface GameCategoryDefinition {
  id: GameCategoryId;
  slug: GameCategoryId;
  label: string;
  description: string;
  icon: string;
}

export interface GameDefinition {
  id: string;
  slug: string;
  categoryId: GameCategoryId;
  title: string;
  description: string;
  /** Rota relativa dentro de /jogos/{categoria}/ — preenchida quando o jogo existir. */
  href?: string;
}

export interface GameVisibilitySettings {
  enabled: boolean;
  visibleRoles: AuthenticatedRole[];
}

export type GameCatalogVisibility = {
  categories: Record<GameCategoryId, GameVisibilitySettings>;
  games: Record<string, GameVisibilitySettings>;
};
