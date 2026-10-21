import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  number?: number;
  id?: string;
  surface?: 'card' | 'plain' | 'worksheet';
};

export function FormStageBlock({ title, description, children, className = '', number, id, surface = 'card' }: Props) {
  const surfaceClass = {
    card: 'rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)] sm:p-6',
    plain: 'border-t border-[var(--border)] py-5 first:border-t-0 first:pt-0',
    worksheet: 'border-b border-[var(--border)] pb-5 last:border-b-0 last:pb-0',
  }[surface];

  return (
    <section id={id} className={`group scroll-mt-24 ${surfaceClass} ${className}`}>
      <div className="mb-4 flex items-start gap-3">
        {number ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)] transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-focus-within:scale-105 motion-reduce:transition-none motion-reduce:group-focus-within:scale-100">
            {number}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-6 tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
