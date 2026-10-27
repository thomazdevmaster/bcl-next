import { AUTHENTICATED_ROLES } from '@/core/auth/roles';
import type {
  GameCatalogVisibility,
  GameCategoryDefinition,
  GameCategoryId,
  GameDefinition,
  GameVisibilitySettings,
} from '@/domains/games/types';

export const GAME_CATEGORIES: GameCategoryDefinition[] = [
  {
    id: 'notas',
    slug: 'notas',
    label: 'Notas',
    description: 'Nome das notas, alturas e leitura na partitura.',
    icon: 'music_note',
  },
  {
    id: 'ritmos',
    slug: 'ritmos',
    label: 'Ritmos',
    description: 'Figuras rítmicas, compasso e pulsação.',
    icon: 'graphic_eq',
  },
  {
    id: 'intervalos',
    slug: 'intervalos',
    label: 'Intervalos',
    description: 'Distâncias entre notas e reconhecimento auditivo.',
    icon: 'compare_arrows',
  },
  {
    id: 'escalas',
    slug: 'escalas',
    label: 'Escalas',
    description: 'Tons, armaduras e construção de escalas.',
    icon: 'linear_scale',
  },
  {
    id: 'instrumentos',
    slug: 'instrumentos',
    label: 'Instrumentos',
    description: 'Famílias, timbres e características dos naipes.',
    icon: 'piano',
  },
];

/** Cadastre novos jogos aqui; a gestão em `/gestao/jogos` controla visibilidade. */
export const REGISTERED_GAMES: GameDefinition[] = [
  {
    id: 'notas-clave-sol-naturais-1',
    slug: 'clave-sol-naturais-1',
    categoryId: 'notas',
    title: 'Clave de sol — Naturais 1',
    description:
      'Leia a nota e escolha o nome.',
    href: '/jogos/notas/clave-sol-naturais-1',
  },
  {
    id: 'notas-clave-sol-naturais-2',
    slug: 'clave-sol-naturais-2',
    categoryId: 'notas',
    title: 'Clave de sol — Naturais 2',
    description:
      'Leia o nome e toque a nota na partitura.',
    href: '/jogos/notas/clave-sol-naturais-2',
  },
];

const ALL_AUTHENTICATED: GameVisibilitySettings['visibleRoles'] = [
  ...AUTHENTICATED_ROLES,
];

export function defaultVisibilitySettings(): GameVisibilitySettings {
  return { enabled: true, visibleRoles: ALL_AUTHENTICATED };
}

export function buildDefaultGameCatalog(): GameCatalogVisibility {
  const categories = {} as Record<GameCategoryId, GameVisibilitySettings>;
  for (const category of GAME_CATEGORIES) {
    categories[category.id] = defaultVisibilitySettings();
  }
  const games: Record<string, GameVisibilitySettings> = {};
  for (const game of REGISTERED_GAMES) {
    games[game.id] = defaultVisibilitySettings();
  }
  return { categories, games };
}

export function getCategoryBySlug(slug: string): GameCategoryDefinition | undefined {
  return GAME_CATEGORIES.find((item) => item.slug === slug);
}

export function gamesInCategory(categoryId: GameCategoryId): GameDefinition[] {
  return REGISTERED_GAMES.filter((game) => game.categoryId === categoryId);
}

export function getGameBySlug(
  categorySlug: string,
  gameSlug: string,
): GameDefinition | undefined {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return undefined;
  return REGISTERED_GAMES.find(
    (game) => game.categoryId === category.id && game.slug === gameSlug,
  );
}
