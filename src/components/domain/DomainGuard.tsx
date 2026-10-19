'use client';

import { useEffect } from 'react';
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

export function DomainGuard({ resource, action = 'read', requireLogin = false, children }: DomainGuardProps) {
  const { roles, permissions, isHydrated, isLoggedIn } = useAuth();
  const router = useRouter();
  const allowed = requireLogin ? isLoggedIn : can(roles, resource, action, permissions);

  useEffect(() => {
    if (!isHydrated) return;
    if (!allowed) {
      router.replace(isLoggedIn ? '/' : '/login');
    }
  }, [allowed, isHydrated, isLoggedIn, router]);

  if (!isHydrated) return null;

  if (!allowed) {
    const domain = getDomain(resource);
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-[var(--muted)]">
          Os perfis <strong>{roleLabels(roles)}</strong> não podem acessar {domain.label.toLowerCase()}.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
