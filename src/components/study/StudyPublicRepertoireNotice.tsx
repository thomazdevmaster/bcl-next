'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { seesPublicStudyRepertoireOnly } from '@/domains/songs/songAccess';

type Props = {
  compact?: boolean;
  className?: string;
};

/** Perfil amigos (e equivalentes): deixa claro que o estudo mostra só repertório público. */
export function StudyPublicRepertoireNotice({ compact = false, className = '' }: Props) {
  const { roles, permissions } = useAuth();
  if (!seesPublicStudyRepertoireOnly(roles, permissions)) return null;

  return (
    <div
      role="status"
      className={`rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)] ${className}`}
    >
      <p className={compact ? 'm-0' : 'mt-0'}>
        Com o perfil <strong className="text-[var(--foreground)]">Amigos</strong>, o estudo lista apenas
        partituras <strong className="text-[var(--foreground)]">públicas</strong>. Músicas privadas da banda não
        aparecem aqui — isso não é o mesmo que acesso completo ao módulo de gestão de músicas.
      </p>
      {!compact ? (
        <p className="mb-0 mt-2">
          Precisa de outro nível de acesso? Ajuste os perfis ativos em{' '}
          <Link href="/profile" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
            Meu perfil
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
