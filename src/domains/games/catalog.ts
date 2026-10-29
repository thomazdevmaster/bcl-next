import { AUTHENTICATED_ROLES } from "@/core/auth/roles";
import type {
  GameCatalogVisibility,
  GameCategoryDefinition,
  GameCategoryId,
  GameDefinition,
  GameVisibilitySettings,
} from "@/domains/games/types";

export const GAME_CATEGORIES: GameCategoryDefinition[] = [
  {
    id: "notas",
    slug: "notas",
    label: "Notas",
    description: "Nome das notas, alturas e leitura na partitura.",
    icon: "music_note",
  },
  {
    id: "ritmos",
    slug: "ritmos",
    label: "Ritmos",
    description: "Figuras rítmicas, compasso e pulsação.",
    icon: "graphic_eq",
  },
  {
    id: "intervalos",
    slug: "intervalos",
    label: "Intervalos",
    description: "Distâncias entre notas e reconhecimento auditivo.",
    icon: "compare_arrows",
  },
  {
    id: "escalas",
    slug: "escalas",
    label: "Escalas",
    description: "Tons, armaduras e construção de escalas.",
    icon: "linear_scale",
  },
  {
    id: "instrumentos",
    slug: "instrumentos",
    label: "Instrumentos",
    description: "Famílias, timbres e características dos naipes.",
    icon: "piano",
  },
];

/** Cadastre novos jogos aqui; a gestão em `/gestao/jogos` controla visibilidade. */
export const REGISTERED_GAMES: GameDefinition[] = [
  {
    id: "notas-clave-sol-naturais-1",
    slug: "clave-sol-naturais-1",
    categoryId: "notas",
    title: "Clave de sol — Naturais 1",
    description: "Leia a nota e escolha o nome.",
    href: "/jogos/notas/clave-sol-naturais-1",
  },
  {
    id: "notas-clave-sol-naturais-2",
    slug: "clave-sol-naturais-2",
    categoryId: "notas",
    title: "Clave de sol — Naturais 2",
    description: "Leia o nome e toque a nota na partitura.",
    href: "/jogos/notas/clave-sol-naturais-2",
  },
  {
    id: "notas-clave-sol-mais-aguda",
    slug: "clave-sol-mais-aguda",
    categoryId: "notas",
    title: "Clave de sol — Mais aguda",
    description: "Compare duas colcheias e escolha a mais aguda.",
    href: "/jogos/notas/clave-sol-mais-aguda",
  },
  {
    id: "notas-clave-sol-ouca-escreva",
    slug: "clave-sol-ouca-escreva",
    categoryId: "notas",
    title: "Clave de sol — Ouça e escreva",
    description: "Ouça a nota e escreva a colcheia na partitura.",
    href: "/jogos/notas/clave-sol-ouca-escreva",
  },
  {
    id: "notas-clave-sol-gire-a-pauta",
    slug: "gire-a-pauta",
    categoryId: "notas",
    title: "Clave de sol — Gire a pauta",
    description: "Leia a colcheia e gire a pauta até o nome da nota.",
    href: "/jogos/notas/gire-a-pauta",
  },
  {
    id: "ritmos-figuras",
    slug: "figuras",
    categoryId: "ritmos",
    title: "Figuras",
    description: "Veja a figura e escolha o nome.",
    href: "/jogos/ritmos/figuras",
  },
  {
    id: "ritmos-qual-dura-mais",
    slug: "qual-dura-mais",
    categoryId: "ritmos",
    title: "Qual dura mais",
    description: "Compare duas figuras e escolha a mais longa.",
    href: "/jogos/ritmos/qual-dura-mais",
  },
  {
    id: "ritmos-complete-o-compasso",
    slug: "complete-o-compasso",
    categoryId: "ritmos",
    title: "Complete o compasso",
    description: "Escolha a figura que fecha o compasso 4/4.",
    href: "/jogos/ritmos/complete-o-compasso",
  },
  {
    id: "ritmos-ouca-o-ritmo",
    slug: "ouca-o-ritmo",
    categoryId: "ritmos",
    title: "Ouça o ritmo",
    description: "Ouça um compasso e escolha a pauta correspondente.",
    href: "/jogos/ritmos/ouca-o-ritmo",
  },
  {
    id: "ritmos-segure-o-tempo",
    slug: "segure-o-tempo",
    categoryId: "ritmos",
    title: "Segure o tempo",
    description: "Segure o botão pelo tempo de cada nota e solte nas pausas.",
    href: "/jogos/ritmos/segure-o-tempo",
  },
  {
    id: "intervalos-nomeie",
    slug: "nomeie",
    categoryId: "intervalos",
    title: "Nomeie",
    description: "Leia duas notas e diga o intervalo.",
    href: "/jogos/intervalos/nomeie",
  },
  {
    id: "intervalos-qual-e-maior",
    slug: "qual-e-maior",
    categoryId: "intervalos",
    title: "Qual é maior",
    description: "Compare dois intervalos e escolha o mais largo.",
    href: "/jogos/intervalos/qual-e-maior",
  },
  {
    id: "intervalos-ouca",
    slug: "ouca",
    categoryId: "intervalos",
    title: "Ouça",
    description: "Ouça duas notas e reconheça o intervalo.",
    href: "/jogos/intervalos/ouca",
  },
  {
    id: "intervalos-escreva",
    slug: "escreva",
    categoryId: "intervalos",
    title: "Escreva",
    description: "A nota grave está na pauta; escreva a aguda.",
    href: "/jogos/intervalos/escreva",
  },
  {
    id: "instrumentos-familia",
    slug: "familia",
    categoryId: "instrumentos",
    title: "Família",
    description: "Diga se o instrumento é madeira, metal, percussão ou corda.",
    href: "/jogos/instrumentos/familia",
  },
  {
    id: "instrumentos-como-se-toca",
    slug: "como-se-toca",
    categoryId: "instrumentos",
    title: "Como se toca",
    description: "Escolha como o instrumento produz o som.",
    href: "/jogos/instrumentos/como-se-toca",
  },
  {
    id: "instrumentos-mais-agudo",
    slug: "mais-agudo",
    categoryId: "instrumentos",
    title: "Mais agudo",
    description: "Compare a região em que dois instrumentos costumam tocar.",
    href: "/jogos/instrumentos/mais-agudo",
  },
  {
    id: "instrumentos-quem-e",
    slug: "quem-e",
    categoryId: "instrumentos",
    title: "Quem é",
    description: "Leia a pista e descubra o instrumento.",
    href: "/jogos/instrumentos/quem-e",
  },
];

const ALL_AUTHENTICATED: GameVisibilitySettings["visibleRoles"] = [
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

export function getCategoryBySlug(
  slug: string,
): GameCategoryDefinition | undefined {
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
