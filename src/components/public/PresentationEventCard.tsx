import Image from 'next/image';
import Link from 'next/link';
import { formatPresentationWhen } from '@/lib/publicPortal';
import type { Presentation } from '@/domains/presentations/types';

interface PresentationEventCardProps {
  event: Presentation;
  compact?: boolean;
  layout?: 'default' | 'home';
}

export function PresentationEventCard({ event, compact = false, layout = 'default' }: PresentationEventCardProps) {
  const when = formatPresentationWhen(event.startsAt);
  const homeLayout = layout === 'home';

  if (compact) {
    return (
      <article className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] ${homeLayout ? 'grid min-h-[138px] grid-cols-[minmax(0,1fr)_108px] gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(104px,32%)]' : 'flex gap-4 p-4'}`}>
        {event.coverUrl ? (
          <div className={`relative shrink-0 overflow-hidden ${homeLayout ? 'col-start-2 row-start-1 h-full min-h-[138px] w-full rounded-none' : 'h-20 w-20 rounded-xl'}`}>
            <Image src={event.coverUrl} alt="" fill className="object-cover" sizes="80px" />
          </div>
        ) : (
          <div
            className={`flex shrink-0 items-center justify-center bg-[var(--accent)] text-[var(--color-brand-strong)] ${homeLayout ? 'col-start-2 row-start-1 h-full min-h-[138px] w-full rounded-none' : 'h-20 w-20 rounded-xl'}`}
            aria-hidden
          >
            <span className={`material-icons ${homeLayout ? 'text-4xl' : 'text-3xl'}`}>event</span>
          </div>
        )}
        <div className={`min-w-0 ${homeLayout ? 'col-start-1 row-start-1 self-center p-4' : 'flex-1'}`}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brand-strong)]">{when}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug text-[var(--foreground)]">{event.title}</h3>
          <p className="mt-1 truncate text-sm text-[var(--muted)]">{event.venue}</p>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
      {event.coverUrl ? (
        <div className="relative h-44 w-full">
          <Image src={event.coverUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
      ) : null}
      <div className="p-6">
        <p className="text-sm font-medium text-[var(--color-brand-strong)]">{when}</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{event.title}</h2>
        <p className="mt-1 text-[var(--muted)]">{event.venue}</p>
        {event.description ? <p className="mt-3 leading-relaxed text-[var(--foreground)]">{event.description}</p> : null}
        <Link
          href="/agenda"
          className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[var(--color-brand-strong)] no-underline hover:underline"
        >
          Ver na agenda
          <span className="material-icons text-base" aria-hidden>
            arrow_forward
          </span>
        </Link>
      </div>
    </article>
  );
}
