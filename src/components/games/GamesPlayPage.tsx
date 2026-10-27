'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryBySlug, getGameBySlug } from '@/domains/games/catalog';
import {
  visibleCategoryForUser,
  visibleGamesInCategory,
} from '@/domains/games/gameAccess';
import { useGameCatalog } from '@/domains/games/useGameCatalog';

const TrebleNaturals1Game = dynamic(
  () =>
    import('@/components/games/notas/TrebleNaturals1Game').then((module) => ({
      default: module.TrebleNaturals1Game,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="px-4 py-12 text-center text-sm text-[var(--muted)]">
        Carregando jogo…
      </p>
    ),
  },
);

interface GamesPlayPageProps {
  categorySlug: string;
  gameSlug: string;
}

function GameRenderer({ gameId }: { gameId: string }) {
  switch (gameId) {
    case 'notas-clave-sol-naturais-1':
      return <TrebleNaturals1Game />;
    default:
      return (
        <div className="mx-auto max-w-xl px-4 py-12 text-sm text-[var(--muted)]">
          Este jogo ainda não está disponível nesta versão do app.
        </div>
      );
  }
}

export function GamesPlayPage({ categorySlug, gameSlug }: GamesPlayPageProps) {
  const { roles, isHydrated } = useAuth();
  const { catalog, loading } = useGameCatalog(isHydrated);
  const category = getCategoryBySlug(categorySlug);
  const game = getGameBySlug(categorySlug, gameSlug);

  if (!category || !game) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-xl font-semibold">Jogo não encontrado</h1>
        <p className="mt-4 text-sm">
          <Link href="/jogos" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
            Voltar aos jogos
          </Link>
        </p>
      </div>
    );
  }

  const categoryVisible = visibleCategoryForUser(roles, categorySlug, catalog);
  const visibleGames = categoryVisible
    ? visibleGamesInCategory(roles, category.id, catalog)
    : [];
  const gameVisible = visibleGames.some((entry) => entry.id === game.id);

  if (!loading && (!categoryVisible || !gameVisible)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-xl font-semibold">Jogo indisponível</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Este jogo não está visível para os seus perfis ativos.
        </p>
        <p className="mt-4 text-sm">
          <Link
            href={`/jogos/${categorySlug}`}
            className="font-medium text-[var(--primary)] underline-offset-2 hover:underline"
          >
            Ver categoria {category.label}
          </Link>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <p className="px-4 py-12 text-center text-sm text-[var(--muted)]" aria-live="polite">
        Carregando…
      </p>
    );
  }

  return <GameRenderer gameId={game.id} />;
}
