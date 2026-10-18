'use client';

import { useEffect, useState } from 'react';
import { can } from '@/core/auth/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { userFacingError } from '@/lib/userMessages';

type PendingUser = { id: string | number; username: string; name: string; email?: string | null; roles?: string[] };

const contactLine = (user: PendingUser) => [`@${user.username}`, user.email].filter(Boolean).join(' · ');
type RoleOption = { code: string; name: string };

export function UserApprovals() {
  const { roles, permissions } = useAuth();
  const allowed = can(roles, 'users', 'approve', permissions);
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [resets, setResets] = useState<PendingUser[]>([]);
  const [options, setOptions] = useState<RoleOption[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({});
  const [issued, setIssued] = useState<{ name: string; username: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!allowed) return;
    Promise.all([
      apiFetch<PendingUser[]>('/users/pending'),
      apiFetch<PendingUser[]>('/users/password-resets'),
      apiFetch<RoleOption[]>('/users/role-options'),
    ])
      .then(([signups, requests, roleOptions]) => {
        setPending(signups);
        setResets(requests);
        setOptions(roleOptions);
        setSelectedRoles((current) => {
          const next = { ...current };
          signups.forEach((user) => {
            if (next[user.id]) return;
            next[user.id] = user.roles?.length ? user.roles : ['amigos'];
          });
          return next;
        });
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(userFacingError(caught));
      });
  };

  useEffect(() => {
    load();
  }, [allowed]);

  if (!allowed) return null;

  const toggleRole = (userId: string | number, code: string) => {
    setSelectedRoles((current) => {
      const selected = current[userId] ?? [];
      return {
        ...current,
        [userId]: selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code],
      };
    });
  };

  const approve = async (user: PendingUser) => {
    const rolesForUser = selectedRoles[user.id] ?? [];
    if (rolesForUser.length === 0) {
      setError('Escolha ao menos um papel para aprovar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/users/${user.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ roles: rolesForUser }),
      });
      load();
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  };

  const reject = async (userId: string | number) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/users/${userId}/reject`, { method: 'POST' });
      load();
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (user: PendingUser) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiFetch<PendingUser & { temporaryPassword?: string }>(`/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      if (updated.temporaryPassword) {
        setIssued({ name: user.name, username: user.username, password: updated.temporaryPassword });
      }
      load();
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-xl font-semibold">Cadastros aguardando aprovação</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Quem tem a permissão de autorizar usuários define o papel e libera o acesso.</p>
        {pending.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Nenhum cadastro pendente.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pending.map((user) => (
              <li key={user.id} className="rounded-lg border border-[var(--border)] p-4">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-[var(--muted)]">{contactLine(user)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {options.map((option) => (
                    <label key={option.code} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-sm">
                      <input
                        type="checkbox"
                        checked={(selectedRoles[user.id] ?? []).includes(option.code)}
                        onChange={() => toggleRole(user.id, option.code)}
                      />
                      {option.name}
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" className="btn-primary min-h-11" disabled={busy} onClick={() => void approve(user)}>
                    Aprovar
                  </button>
                  <button type="button" className="btn-danger min-h-11" disabled={busy} onClick={() => void reject(user.id)}>
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-xl font-semibold">Pedidos de nova senha</h2>
        {resets.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Nenhum pedido.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {resets.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-[var(--muted)]">{contactLine(user)}</p>
                </div>
                <button type="button" className="btn-primary min-h-11" disabled={busy} onClick={() => void resetPassword(user)}>
                  Gerar senha
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {issued && (
        <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <h2 id="reset-password-title" className="text-xl font-semibold">Senha nova</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Envie esta senha para <strong>{issued.name}</strong> (usuário <code>{issued.username}</code>). Ela precisa ser trocada no próximo acesso e não aparece de novo.
            </p>
            <input readOnly value={issued.password} className="mt-4 min-h-11 w-full font-mono" onFocus={(event) => event.currentTarget.select()} />
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" className="btn-outline-primary min-h-11" onClick={() => void navigator.clipboard.writeText(issued.password).catch(() => undefined)}>
                Copiar
              </button>
              <button type="button" className="btn-primary min-h-11" onClick={() => setIssued(null)}>
                Já anotei
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
