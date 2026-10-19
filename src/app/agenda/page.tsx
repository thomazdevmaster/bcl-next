'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MusicLoader } from '@/components/MusicLoader';
import { PortalPageHeader } from '@/components/public/PortalPageHeader';
import { PresentationEventCard } from '@/components/public/PresentationEventCard';
import { apiFetch } from '@/lib/api';
import { failureMessage } from '@/lib/userMessages';
import { sortPresentationsByDate, upcomingPublicPresentations } from '@/lib/publicPortal';
import type { Presentation } from '@/domains/presentations/types';

export default function AgendaPage() {
  const [items, setItems] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Presentation[]>('/presentations')
      .then((list) => setItems(list.filter((item) => item.isPublic)))
      .catch((caught: unknown) => setError(failureMessage(caught, 'Não foi possível carregar a agenda.')))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = useMemo(() => upcomingPublicPresentations(items), [items]);
  const past = useMemo(() => {
    const now = Date.now();
    return sortPresentationsByDate(items.filter((item) => new Date(item.startsAt).getTime() < now)).reverse();
  }, [items]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 md:py-12">
      <PortalPageHeader
        title="Agenda"
        description="Apresentações abertas ao público. Eventos internos da banda só aparecem após o login, conforme o perfil."
        actions={
          <Link href="/" className="btn-outline-primary inline-flex min-h-11 items-center gap-1 px-4 text-sm">
            <span className="material-icons text-lg" aria-hidden>
              home
            </span>
            Início
          </Link>
        }
      />

      {error ? <p className="mt-8 text-[var(--destructive)]">{error}</p> : null}

      {loading ? <MusicLoader label="Carregando agenda…" className="mt-10" /> : null}

      {!loading && !error ? (
        <>
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Próximos eventos</h2>
            {upcoming.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-[var(--muted)]">
                Nenhum evento público agendado. Volte em breve ou acompanhe o{' '}
                <Link href="/blog" className="text-[var(--color-brand-strong)]">
                  blog
                </Link>
                .
              </p>
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {upcoming.map((item) => (
                  <PresentationEventCard key={item.id} event={item} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 ? (
            <section className="mt-14 border-t border-[var(--border)] pt-10">
              <h2 className="text-xl font-semibold text-[var(--muted)]">Eventos anteriores</h2>
              <ul className="mt-6 space-y-3">
                {past.slice(0, 5).map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium text-[var(--foreground)]">{item.title}</span>
                    <span className="text-sm text-[var(--muted)]">
                      {new Date(item.startsAt).toLocaleDateString('pt-BR')} · {item.venue}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
