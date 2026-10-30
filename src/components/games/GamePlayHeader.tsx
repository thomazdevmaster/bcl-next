'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { GameHelpDialog } from '@/components/games/GameHelpDialog';

interface GamePlayHeaderProps {
  categoryLine: string;
  title: string;
  backHref: string;
  helpTitle: string;
  helpDescription?: string;
  helpContent: ReactNode;
}

export function GamePlayHeader({
  categoryLine,
  title,
  backHref,
  helpTitle,
  helpDescription,
  helpContent,
}: GamePlayHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
          {categoryLine}
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <GameHelpDialog title={helpTitle} description={helpDescription}>
          {helpContent}
        </GameHelpDialog>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-medium no-underline hover:no-underline"
        >
          Voltar
        </Link>
      </div>
    </header>
  );
}
