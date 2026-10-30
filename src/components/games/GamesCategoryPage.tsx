'use client';

import Link from 'next/link';
import { PortalPageHeader } from '@/components/public/PortalPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryBySlug } from '@/domains/games/catalog';
import { visibleCategoryForUser, visibleGamesInCategory } from '@/domains/games/gameAccess';
import { useGameCatalog } from '@/domains/games/useGameCatalog';

interface GamesCategoryPageProps {
  categorySlug: string;
}

export function GamesCategoryPage({ categorySlug }: GamesCategoryPageProps) {
  const { roles, isHydrated } = useAuth();
  const { catalog, loading, error } = useGameCatalog(isHydrated);
  const staticCategory = getCategoryBySlug(categorySlug);
  const category = visibleCategoryForUser(roles, categorySlug, catalog);
  const games = category ? visibleGamesInCategory(roles, category.id, catalog) : [];

  if (!staticCategory) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-xl font-semibold">Categoria não encontrada</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          <Link href="/jogos" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
            Voltar aos jogos
          </Link>
        </p>
      </div>
    );
  }

  if (!loading && !category) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-xl font-semibold">Categoria indisponível</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Esta categoria não está visível para os seus perfis ativos.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/jogos" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
            Voltar aos jogos
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
      <PortalPageHeader
        eyebrow="Jogos"
        title={staticCategory.label}
        description={staticCategory.description}
        actions={
          <Link
            href="/jogos"
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--foreground)] no-underline hover:no-underline"
          >
            Todas as categorias
          </Link>
        }
      />

      {error ? (
        <p className="rounded-xl border border-[var(--destructive)]/40 px-4 py-3 text-sm text-[var(--destructive)]" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]" aria-live="polite">
          Carregando jogos…
        </p>
      ) : null}

      {!loading && games.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-secondary)] px-6 py-10 text-center">
          <span className="material-icons text-4xl text-[var(--muted)]" aria-hidden>
            construction
          </span>
          <h2 className="mt-4 text-lg font-semibold">Em breve</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            Ainda não há jogos publicados nesta categoria. Novos jogos aparecerão aqui assim que forem cadastrados na
            gestão.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {games.map((game) => (
          <Link
            key={game.id}
            href={game.href ?? '#'}
            className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline shadow-[var(--shadow-soft)] hover:no-underline ${
              game.href ? 'hover:border-[var(--color-brand)]/40' : 'pointer-events-none opacity-60'
            }`}
            aria-disabled={!game.href}
          >
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{game.title}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{game.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
