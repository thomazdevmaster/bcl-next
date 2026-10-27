'use client';

import Link from 'next/link';
import { PortalPageHeader } from '@/components/public/PortalPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { visibleCategoriesForUser } from '@/domains/games/gameAccess';
import { useGameCatalog } from '@/domains/games/useGameCatalog';

export function GamesHub() {
  const { roles, isHydrated } = useAuth();
  const { catalog, loading, error } = useGameCatalog(isHydrated);

  const categories = visibleCategoriesForUser(roles, catalog);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
      <PortalPageHeader
        eyebrow="Minha área"
        title="Jogos"
        description="Atividades leves para reforçar leitura, ritmo, intervalos, escalas e instrumentos. Escolha uma categoria para ver os jogos disponíveis."
      />

      {error ? (
        <p className="rounded-xl border border-[var(--destructive)]/40 bg-[var(--card)] px-4 py-3 text-sm text-[var(--destructive)]" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]" aria-live="polite">
          Carregando categorias…
        </p>
      ) : null}

      {!loading && categories.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
          Nenhuma categoria está disponível para os seus perfis ativos no momento.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/jogos/${category.slug}`}
            className="flex min-h-[8.5rem] flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline shadow-[var(--shadow-soft)] transition hover:border-[var(--color-brand)]/40 hover:no-underline"
          >
            <span className="material-icons text-[var(--color-brand)]" aria-hidden>
              {category.icon}
            </span>
            <h2 className="mt-3 text-lg font-semibold text-[var(--foreground)]">{category.label}</h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-[var(--muted)]">{category.description}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--color-brand-strong)]">
              Ver jogos
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
