'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasRole } from '@/core/auth/roles';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { userFacingError } from '@/lib/userMessages';

type CatalogAction = { action: string; label: string };
type CatalogResource = { resource: string; label: string; hint: string; actions: CatalogAction[] };
type CatalogGroup = { id: string; label: string; resources: CatalogResource[] };
type RoleMember = { id: string; name: string; email: string };
type RoleRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  systemRole: boolean;
  locked: boolean;
  permissions: string[];
  users: RoleMember[];
};
type Account = { id: string; username: string; name: string; email?: string | null };

const emptyDraft = {
  code: '',
  name: '',
  description: '',
  permissions: [] as string[],
};

export default function PapeisPage() {
  const { roles, isLoggedIn } = useAuth();
  const router = useRouter();
  const admin = hasRole(roles, 'admin');
  const [catalog, setCatalog] = useState<CatalogGroup[]>([]);
  const [roleList, setRoleList] = useState<RoleRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [userQuery, setUserQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = roleList.find((role) => role.id === selectedId) ?? null;

  useEffect(() => {
    if (isLoggedIn && !admin) router.replace('/gestao');
  }, [admin, isLoggedIn, router]);

  useEffect(() => {
    if (!admin) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      apiFetch<CatalogGroup[]>('/roles/catalog'),
      apiFetch<RoleRecord[]>('/roles'),
      apiFetch<Account[]>('/users'),
    ])
      .then(([groups, roles, users]) => {
        if (!active) return;
        setCatalog(groups);
        setRoleList(roles);
        setAccounts(users);
        setSelectedId((current) => current ?? roles[0]?.id ?? null);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(userFacingError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [admin]);

  useEffect(() => {
    if (selectedId === 'new') {
      setDraft(emptyDraft);
      return;
    }
    if (!selected) return;
    setDraft({
      code: selected.code,
      name: selected.name,
      description: selected.description ?? '',
      permissions: selected.permissions,
    });
  }, [selected, selectedId]);

  const visibleAccounts = useMemo(() => {
    const query = userQuery.trim().toLocaleLowerCase('pt-BR');
    if (!query) return accounts;
    return accounts.filter((account) =>
      `${account.name} ${account.username} ${account.email ?? ''}`.toLocaleLowerCase('pt-BR').includes(query),
    );
  }, [accounts, userQuery]);

  const togglePermission = (key: string) => {
    if (selected?.locked) return;
    setDraft((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((item) => item !== key)
        : [...current.permissions, key],
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: draft.code,
        name: draft.name,
        description: draft.description,
        permissions: draft.permissions,
      };
      const saved =
        selectedId === 'new'
          ? await apiFetch<RoleRecord>('/roles', { method: 'POST', body: JSON.stringify(payload) })
          : await apiFetch<RoleRecord>(`/roles/${selectedId}`, { method: 'PUT', body: JSON.stringify(payload) });
      setRoleList((current) => {
        const exists = current.some((role) => role.id === saved.id);
        return exists ? current.map((role) => (role.id === saved.id ? saved : role)) : [...current, saved];
      });
      setSelectedId(saved.id);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/roles/${selected.id}`, { method: 'DELETE' });
      const next = roleList.filter((role) => role.id !== selected.id);
      setRoleList(next);
      setSelectedId(next[0]?.id ?? null);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (account: Account, linked: boolean) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = linked
        ? await apiFetch<RoleRecord>(`/roles/${selected.id}/users/${account.id}`, { method: 'DELETE' })
        : await apiFetch<RoleRecord>(`/roles/${selected.id}/users`, {
            method: 'POST',
            body: JSON.stringify({ userId: account.id }),
          });
      setRoleList((current) => current.map((role) => (role.id === updated.id ? updated : role)));
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  if (!admin) return null;

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Acesso</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Papéis</h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            Somente o administrador cria papéis, edita permissões e vincula usuários. O papel Administrador permanece com acesso total.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary min-h-11"
          onClick={() => setSelectedId('new')}
        >
          Novo papel
        </button>
      </header>

      {error && <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      {loading ? (
        <p className="text-[var(--muted)]">Carregando papéis…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <ul className="space-y-2">
            {roleList.map((role) => (
              <li key={role.id}>
                <button
                  type="button"
                  className={`min-h-11 w-full rounded-xl border px-4 py-3 text-left ${
                    role.id === selectedId
                      ? 'border-[var(--color-brand)] bg-[var(--card)]'
                      : 'border-[var(--border)] bg-[var(--card)]'
                  }`}
                  onClick={() => setSelectedId(role.id)}
                >
                  <span className="block font-semibold">{role.name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {role.code} · {role.users.length} usuário{role.users.length === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selectedId && (
            <form
              className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Nome</span>
                  <input
                    className="min-h-11"
                    value={draft.name}
                    required
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Código</span>
                  <input
                    className="min-h-11"
                    value={draft.code}
                    required
                    readOnly={selectedId !== 'new'}
                    pattern="[a-z][a-z0-9_]{1,31}"
                    onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toLowerCase() }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm md:col-span-2">
                  <span className="font-medium">Descrição</span>
                  <textarea
                    rows={2}
                    value={draft.description}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
              </div>

              {catalog.map((group) => (
                <fieldset key={group.id} className="space-y-3">
                  <legend className="text-lg font-semibold">{group.label}</legend>
                  {group.resources.map((resource) => (
                    <div key={`${group.id}-${resource.resource}`} className="rounded-lg border border-[var(--border)] p-3">
                      <p className="font-medium">{resource.label}</p>
                      <p className="text-xs text-[var(--muted)]">{resource.hint}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {resource.actions.map((action) => {
                          const key = `${resource.resource}:${action.action}`;
                          return (
                            <label key={key} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-sm">
                              <input
                                type="checkbox"
                                checked={draft.permissions.includes(key)}
                                disabled={Boolean(selected?.locked) || saving}
                                onChange={() => togglePermission(key)}
                              />
                              {action.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </fieldset>
              ))}

              {selected && (
                <fieldset className="space-y-3">
                  <legend className="text-lg font-semibold">Usuários</legend>
                  <input
                    className="min-h-11 w-full"
                    placeholder="Buscar por nome ou e-mail"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                  />
                  <ul className="max-h-80 space-y-2 overflow-y-auto">
                    {visibleAccounts.map((account) => {
                      const linked = selected.users.some((member) => member.id === account.id);
                      return (
                        <li key={account.id}>
                          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--border)] px-3">
                            <input
                              type="checkbox"
                              checked={linked}
                              disabled={saving}
                              onChange={() => void toggleUser(account, linked)}
                            />
                            <span>
                              <span className="block font-medium">{account.name}</span>
                              <span className="text-xs text-[var(--muted)]">
                                {[`@${account.username}`, account.email].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              )}

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn-primary min-h-11" disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar papel'}
                </button>
                {selected && !selected.locked && (
                  <button type="button" className="btn-danger min-h-11" disabled={saving} onClick={() => void remove()}>
                    Excluir papel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
