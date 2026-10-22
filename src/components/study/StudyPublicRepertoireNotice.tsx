'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { seesPublicRepertoireOnly } from '@/domains/songs/songAccess';

type Props = {
  compact?: boolean;
  /** Onde o aviso aparece — ajusta a redação. */
  context?: 'study' | 'songs' | 'any';
  className?: string;
};

/** Perfil amigos (e equivalentes): repertório público no estudo e em Músicas. */
export function StudyPublicRepertoireNotice({
  compact = false,
  context = 'any',
  className = '',
}: Props) {
  const { roles, permissions } = useAuth();
  if (!seesPublicRepertoireOnly(roles, permissions)) return null;

  const scope =
    context === 'study'
      ? 'No estudo'
      : context === 'songs'
        ? 'No módulo Músicas'
        : 'No estudo e no módulo Músicas';

  return (
    <div
      role="status"
      className={`rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)] ${className}`}
    >
      <p className={compact ? 'm-0' : 'mt-0'}>
        Com o perfil <strong className="text-[var(--foreground)]">Amigos</strong>, {scope.toLowerCase()}{' '}
        {context === 'any' ? 'você vê apenas' : 'aparecem só'} partituras{' '}
        <strong className="text-[var(--foreground)]">públicas</strong>. Músicas privadas da banda ficam ocultas —
        isso não é gestão completa do repertório (criar, editar ou ver tudo).
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
