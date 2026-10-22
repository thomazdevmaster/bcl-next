'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { roleLabels } from '@/core/auth/roles';
import { resolveGestaoPathAccess } from '@/core/navigation/gestaoPathAccess';
import { useAuth } from '@/contexts/AuthContext';
import { getDomain } from '@/domains/catalog';

export function GestaoModuleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { roles, permissions, isHydrated } = useAuth();
  const access = resolveGestaoPathAccess(pathname ?? '/gestao', roles, permissions);

  if (!isHydrated) return null;

  if (access.allowed) {
    return <>{children}</>;
  }

  let title = 'Acesso restrito';
  let body: ReactNode;

  if (access.kind === 'deny-unknown') {
    title = 'Página não encontrada';
    body = (
      <>
        Este endereço de gestão não existe ou não está disponível.
        <span className="mt-3 block">
          Volte ao{' '}
          <Link href="/gestao" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
            painel de gestão
          </Link>
          .
        </span>
      </>
    );
  } else if (access.kind === 'deny-admin') {
    body = (
      <>
        Somente administradores podem gerenciar papéis e permissões.
        <span className="mt-3 block">
          Perfis ativos: <strong>{roleLabels(roles)}</strong>.
        </span>
      </>
    );
  } else if (access.kind === 'deny') {
    const domain = getDomain(access.resource);
    body = (
      <>
        Os perfis <strong>{roleLabels(roles)}</strong> não podem acessar {domain.label.toLowerCase()} nesta rota.
        <span className="mt-3 block">
          Ative outro perfil em{' '}
          <Link href="/profile" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
            Meu perfil
          </Link>{' '}
          ou volte ao{' '}
          <Link href="/gestao" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
            painel
          </Link>
          .
        </span>
      </>
    );
  } else {
    body = null;
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</div>
    </div>
  );
}
