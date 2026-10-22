'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { can, type Action, type Resource } from '@/core/auth/permissions';
import { roleLabels } from '@/core/auth/roles';
import { useAuth } from '@/contexts/AuthContext';
import { getDomain } from '@/domains/catalog';

interface DomainGuardProps {
  resource: Resource;
  action?: Action;
  /** Qualquer pessoa autenticada, sem depender do papel. */
  requireLogin?: boolean;
  children: React.ReactNode;
}

function guardDeniedCopy(
  resource: Resource,
  domainLabel: string,
  roles: ReturnType<typeof useAuth>['roles'],
): { title: string; body: ReactNode } {
  if (resource === 'study') {
    return {
      title: 'Modo de estudo indisponível',
      body: (
        <>
          Os perfis ativos (<strong>{roleLabels(roles)}</strong>) não incluem permissão para abrir o{' '}
          <strong>modo de estudo</strong>. Isso é independente do módulo de gestão de músicas na banda.
          <span className="mt-3 block">
            Ative outro perfil em{' '}
            <Link href="/profile" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
              Meu perfil
            </Link>{' '}
            ou volte ao{' '}
            <Link href="/" className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
              início
            </Link>
            .
          </span>
        </>
      ),
    };
  }
  return {
    title: 'Acesso restrito',
    body: (
      <>
        Os perfis <strong>{roleLabels(roles)}</strong> não podem acessar {domainLabel.toLowerCase()}.
      </>
    ),
  };
}

export function DomainGuard({ resource, action = 'read', requireLogin = false, children }: DomainGuardProps) {
  const { roles, permissions, isHydrated, isLoggedIn } = useAuth();
  const router = useRouter();
  const allowed = requireLogin ? isLoggedIn : can(roles, resource, action, permissions);
  const stayOnDenied = resource === 'study' && isLoggedIn && !allowed;

  useEffect(() => {
    if (!isHydrated || allowed || stayOnDenied) return;
    if (!allowed) {
      router.replace(isLoggedIn ? '/' : '/login');
    }
  }, [allowed, isHydrated, isLoggedIn, router, stayOnDenied]);

  if (!isHydrated) return null;

  if (!allowed) {
    const domain = getDomain(resource);
    const copy = guardDeniedCopy(resource, domain.label, roles);
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h1 className="text-xl font-semibold">{copy.title}</h1>
        <div className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{copy.body}</div>
      </div>
    );
  }

  return <>{children}</>;
}
