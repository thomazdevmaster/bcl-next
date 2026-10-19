'use client';

import { AUTHENTICATED_ROLES, ROLE_LABEL, type AccessRoles, type Role } from '@/core/auth/roles';

function sortAccountRoles(roles: AccessRoles): AccessRoles {
  const order = new Map<string, number>(AUTHENTICATED_ROLES.map((role, index) => [role, index]));
  return [...roles].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}

export function ActiveRolesSelector({
  accountRoles,
  activeRoles,
  onChange,
  disabled = false,
}: {
  accountRoles: AccessRoles;
  activeRoles: AccessRoles;
  onChange: (roles: AccessRoles) => void;
  disabled?: boolean;
}) {
  if (accountRoles.length <= 1) {
    const only = accountRoles[0];
    if (!only) return null;
    return (
      <p className="text-sm text-[var(--muted)]">
        Perfil: <strong className="text-[var(--foreground)]">{ROLE_LABEL[only as Role] ?? only}</strong>
      </p>
    );
  }

  const sorted = sortAccountRoles(accountRoles);
  const activeSet = new Set(activeRoles);

  const toggle = (role: string) => {
    if (disabled) return;
    const next = activeSet.has(role)
      ? activeRoles.filter((item) => item !== role)
      : [...activeRoles, role];
    if (next.length === 0) return;
    onChange(next);
  };

  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="text-sm font-medium text-[var(--foreground)]">Perfis de acesso</legend>
      <p className="text-xs text-[var(--muted)]">
        Escolha um ou mais perfis para usar o menu e as permissões do sistema. Pelo menos um deve ficar
        ativo.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Perfis de acesso">
        {sorted.map((role) => {
          const selected = activeSet.has(role);
          const label = ROLE_LABEL[role as Role] ?? role;
          return (
            <button
              key={role}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'border-[var(--border)] bg-[var(--card-secondary)] text-[var(--foreground)] hover:border-[var(--primary)]'
              }`}
              onClick={() => toggle(role)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
