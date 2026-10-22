'use client';

import Link from 'next/link';
import { can } from '@/core/auth/permissions';
import { roleLabels } from '@/core/auth/roles';
import { getManagementNav } from '@/core/navigation/menus';
import { useAuth } from '@/contexts/AuthContext';
import { DOMAINS } from '@/domains/catalog';
import { seesPublicRepertoireOnly } from '@/domains/songs/songAccess';

export default function GestaoPage() {
  const { roles, permissions, displayName, accountRoles } = useAuth();
  const nav = getManagementNav(roles, permissions).filter((item) => item.href !== '/gestao');

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Painel</p>
        <h1 className="mt-2 text-3xl font-semibold">Olá, {displayName}</h1>
        <p className="mt-2 text-[var(--muted)]">
          Você está usando o sistema como <strong>{roleLabels(roles)}</strong>. Os módulos abaixo seguem os perfis
          ativos nesta sessão
          {accountRoles.length > 1 ? (
            <>
              {' '}
              (altere em <Link href="/profile">Meu perfil</Link>).
            </>
          ) : (
            '.'
          )}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nav.map((item) => {
          const domain = DOMAINS.find((entry) => entry.path === item.href);
          const writable = domain
            ? can(roles, domain.id, 'create', permissions) || can(roles, domain.id, 'update', permissions)
            : false;
          const isStudy = item.href === '/study';
          const isSongs = item.href === '/gestao/musicas';
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 no-underline shadow-[var(--shadow-soft)] hover:no-underline"
            >
              <span className="material-icons text-[var(--color-brand)]">{item.icon}</span>
              <h2 className="mt-3 text-lg font-semibold text-[var(--foreground)]">{item.label}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {domain?.description ??
                  (isStudy && seesPublicRepertoireOnly(roles, permissions)
                    ? 'Treino com partitura e MIDI — neste perfil, apenas o repertório público.'
                    : isSongs && seesPublicRepertoireOnly(roles, permissions)
                      ? 'Consulta ao repertório público — partituras liberadas para amigos.'
                      : isSongs
                        ? 'Repertório e gestão de partituras conforme suas permissões.'
                        : 'Estudos e treinamentos com partituras e acompanhamento MIDI.')}
              </p>
              <p className="mt-3 text-xs uppercase tracking-wide text-[var(--color-brand-strong)]">
                {isStudy || isSongs
                  ? 'Abrir módulo'
                  : writable
                    ? 'Leitura e escrita'
                    : 'Somente leitura'}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
