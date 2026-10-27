'use client';

import { type ReactNode, useState } from 'react';
import { EntityDialog } from '@/components/shared/EntityDialog';
import type { GameHelpSection } from '@/domains/games/gameHelp.types';

export function GameHelpBody({ sections }: { sections: GameHelpSection[] }) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section key={section.heading}>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {section.heading}
          </h3>
          {section.paragraphs?.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]"
            >
              {paragraph}
            </p>
          ))}
          {section.list?.length ? (
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--muted)]">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

interface GameHelpDialogProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function GameHelpDialog({
  title,
  description,
  children,
}: GameHelpDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 text-sm font-medium text-[var(--foreground)] sm:px-3"
        aria-label="Como jogar"
        aria-haspopup="dialog"
      >
        <span className="material-icons text-xl" aria-hidden>
          help_outline
        </span>
        <span className="hidden sm:inline">Ajuda</span>
      </button>
      <EntityDialog
        open={open}
        title={title}
        description={description}
        size="md"
        placement="bottom"
        confirmBeforeClose={false}
        onClose={() => setOpen(false)}
      >
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-6">
          {children}
        </div>
      </EntityDialog>
    </>
  );
}
