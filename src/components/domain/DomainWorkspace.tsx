'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { sealPassword } from '@/lib/passwordCipher';
import { failureMessage, userFacingError } from '@/lib/userMessages';
import { usesRemoteApi } from '@/core/auth/accessToken';
import { can } from '@/core/auth/permissions';
import { hasRole, roleLabels } from '@/core/auth/roles';
import { useAuth } from '@/contexts/AuthContext';
import { getDomain } from '@/domains/catalog';
import {
  getCrudConfig,
  getValue,
  type CrudColumn,
  type CrudField,
  type CrudOption,
  type CrudOptionSource,
} from '@/domains/crudConfig';
import type { CrudResource } from '@/core/auth/permissions';
import { filterPeopleForRole } from '@/domains/people/visibility';
import type { Person } from '@/domains/people/types';
import { TableView } from '@/components/tables/core/TableView';
import { EntityDialog } from '@/components/shared/EntityDialog';
import { EntityForm, type EntityFormDynamicChoices } from './EntityForm';
import { createDomainTableColumns } from './table-columns';
import { DomainGuard } from './DomainGuard';

interface DomainWorkspaceProps {
  resource: CrudResource;
  /** @deprecated Columns and fields now come from the domain CRUD configuration. */
  entityFields?: string[];
}

type DialogMode = 'create' | 'view' | 'edit' | null;

const buttonMotion = 'transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100';
const iconMotion = 'transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-75 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-active:scale-100';
const controlMotion = 'transition-[border-color,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none';

/** Opção de pessoa com o que o formulário precisa para filtrar (sem conta, não é a própria). */
interface PersonChoice extends CrudOption {
  hasUser: boolean;
}

interface IssuedPassword {
  name: string;
  username: string;
  password: string;
}

export function DomainWorkspace({ resource }: DomainWorkspaceProps) {
  const domain = getDomain(resource);
  const config = getCrudConfig(resource);
  const { roles, permissions, user } = useAuth();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(config.defaults);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [issuedPassword, setIssuedPassword] = useState<IssuedPassword | null>(null);
  const [roleChoices, setRoleChoices] = useState<CrudOption[] | null>(null);
  const [choices, setChoices] = useState<EntityFormDynamicChoices>({ people: null, instruments: null });
  const canCreate = can(roles, resource, 'create', permissions);
  const canUpdate = can(roles, resource, 'update', permissions);
  const canDelete = can(roles, resource, 'delete', permissions);
  const managesRoles = hasRole(roles, 'admin');

  const sources = useMemo(() => {
    const needed = new Set<CrudOptionSource>();
    for (const field of config.fields) {
      if (field.optionsSource) needed.add(field.optionsSource);
    }
    return needed;
  }, [config.fields]);
  const needsPeople = sources.has('people') || sources.has('people-without-user');
  const needsInstruments = sources.has('instruments');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await apiFetch<Record<string, unknown>[]>(`/${domain.apiResource}`));
    } catch (caught) {
      setError(failureMessage(caught, 'Não foi possível carregar os registros. Confirme se a API está rodando.'));
    } finally {
      setLoading(false);
    }
  }, [domain.apiResource]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (resource !== 'users' || !managesRoles) return;
    let active = true;
    apiFetch<Array<{ code: string; name: string }>>('/roles')
      .then((data) => {
        if (active) setRoleChoices(data.map((role) => ({ value: role.code, label: role.name })));
      })
      .catch(() => {
        if (active) setRoleChoices(null);
      });
    return () => {
      active = false;
    };
  }, [managesRoles, resource]);

  // Pessoas: usadas como responsável, dono de instrumento e pessoa do usuário.
  useEffect(() => {
    if (!needsPeople) return;
    let active = true;
    apiFetch<Array<Pick<Person, 'id' | 'firstName' | 'lastName' | 'userId'>>>('/people')
      .then((data) => {
        if (!active) return;
        setChoices((current) => ({
          ...current,
          people: data.map((person) => ({
            value: String(person.id),
            label: `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || String(person.id),
            hasUser: person.userId != null && person.userId !== '',
          })),
        }));
      })
      .catch(() => {
        if (active) setChoices((current) => ({ ...current, people: null }));
      });
    return () => {
      active = false;
    };
  }, [needsPeople]);

  // Catálogo de instrumentos (trompete, sax alto) para músico e patrimônio.
  useEffect(() => {
    if (!needsInstruments) return;
    let active = true;
    apiFetch<Array<{ id: string | number; name?: string; tuning?: string; status?: string }>>('/instruments')
      .then((data) => {
        if (!active) return;
        setChoices((current) => ({
          ...current,
          instruments: data
            .filter((item) => item.status !== 'inactive')
            .map((item) => ({
              value: String(item.id),
              label: [item.name, item.tuning].filter(Boolean).join(' · ') || String(item.id),
            })),
        }));
      })
      .catch(() => {
        if (active) setChoices((current) => ({ ...current, instruments: null }));
      });
    return () => {
      active = false;
    };
  }, [needsInstruments]);

  // Depois de salvar uma pessoa, a lista de pessoas usada nos selects precisa refletir a conta nova.
  const refreshPeopleChoices = (saved: Record<string, unknown>) => {
    if (!needsPeople) return;
    setChoices((current) => {
      if (!current.people) return current;
      const id = String(saved.id);
      const entry: PersonChoice = {
        value: id,
        label: `${String(saved.firstName ?? '')} ${String(saved.lastName ?? '')}`.trim() || id,
        hasUser: saved.userId != null && saved.userId !== '',
      };
      const exists = current.people.some((person) => person.value === id);
      return {
        ...current,
        people: exists
          ? current.people.map((person) => (person.value === id ? entry : person))
          : [...current.people, entry],
      };
    });
  };

  const rows = useMemo(() => {
    let visibleItems = config.filter ? items.filter(config.filter) : items;
    if (resource === 'people') {
      visibleItems = filterPeopleForRole(
        visibleItems as unknown as Person[],
        roles,
        permissions,
      ) as unknown as Record<string, unknown>[];
    }
    return visibleItems;
  }, [config, items, permissions, resource, roles]);

  const tableColumns = useMemo(
    () => createDomainTableColumns(
      config.columns,
      (row, column) => formatCell(row, column, roleChoices, choices.people),
      resource,
    ),
    [choices.people, config.columns, resource, roleChoices],
  );

  const openCreate = () => {
    setSelected(null);
    setValues({ ...config.defaults });
    setFormErrors({});
    setDialogMode('create');
  };

  const openItem = useCallback((item: Record<string, unknown>, mode: 'view' | 'edit') => {
    setSelected(item);
    setValues({
      ...config.defaults,
      ...(config.toForm ? config.toForm(item) : item),
    });
    setFormErrors({});
    setDialogMode(mode);
  }, [config]);

  const renderRowActions = useCallback((row: Record<string, unknown>) => (
    <div className="flex justify-end gap-1">
      {resource === 'songs' ? (
        songHasScore(row) ? (
          <Link
            href={`/study/${row.id}`}
            title="Estudar"
            aria-label="Estudar"
            className={`group inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)] ${buttonMotion}`}
          >
            <span className={`material-icons text-lg ${iconMotion}`} aria-hidden="true">school</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Sem partitura"
            aria-label="Estudar"
            className="inline-flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-full text-[var(--muted)] opacity-40"
          >
            <span className="material-icons text-lg" aria-hidden="true">school</span>
          </button>
        )
      ) : null}
      <ActionButton icon="visibility" label="Visualizar" onClick={() => openItem(row, 'view')} />
      {canUpdate && (
        <ActionButton icon="edit" label="Editar" onClick={() => openItem(row, 'edit')} />
      )}
      {canDelete && (
        <ActionButton
          icon="delete"
          label="Excluir"
          danger
          disabled={resource === 'users' && String(row.id) === String(user?.id)}
          onClick={() => setDeleteTarget(row)}
        />
      )}
    </div>
  ), [canDelete, canUpdate, openItem, resource, user?.id]);

  const closeDialog = () => {
    if (saving) return;
    setDialogMode(null);
    setSelected(null);
    setFormErrors({});
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateValues(config.fields, values);

    if (resource === 'users' && !managesRoles) {
      const previous = Array.isArray(selected?.roles) ? selected.roles.map(String).sort() : [];
      const next = Array.isArray(values.roles) ? values.roles.map(String).sort() : [];
      if (previous.join('|') !== next.join('|')) {
        errors.roles = 'Somente um administrador pode vincular ou desvincular papéis.';
      }
    }

    for (const uniqueField of uniqueFieldsForResource(resource)) {
      const candidate = normalizeUniqueValue(values[uniqueField]);
      if (
        candidate &&
        items.some(
          (item) =>
            item.id !== selected?.id && normalizeUniqueValue(getValue(item, uniqueField)) === candidate,
        )
      ) {
        errors[uniqueField] = 'Já existe um registro com este valor.';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const mapped = config.toPayload
        ? config.toPayload(values, selected ?? undefined)
        : withAudit(values, selected ?? undefined);
      const payload: Record<string, unknown> = dialogMode === 'create' ? mapped : { ...selected, ...mapped };
      // Senha de usuário nunca sai em claro: cifrada para a API; no mock, nem é enviada.
      if (typeof payload.password === 'string') {
        if (!usesRemoteApi() || !payload.password) {
          delete payload.password;
        } else {
          payload.password = await sealPassword(payload.password);
        }
      }
      const endpoint =
        dialogMode === 'create'
          ? `/${domain.apiResource}`
          : `/${domain.apiResource}/${String(selected?.id)}`;
      const saved = await apiFetch<Record<string, unknown>>(endpoint, {
        method: dialogMode === 'create' ? 'POST' : 'PUT',
        body: JSON.stringify(payload),
      });
      const temporaryPassword = typeof saved.temporaryPassword === 'string' ? saved.temporaryPassword : '';
      const stored = { ...saved };
      delete stored.temporaryPassword;
      setItems((current) =>
        dialogMode === 'create'
          ? [...current, stored]
          : current.map((item) => (item.id === stored.id ? stored : item)),
      );
      if (resource === 'people') refreshPeopleChoices(stored);
      if (resource === 'users' && dialogMode === 'create') {
        setChoices((current) => ({
          ...current,
          people:
            current.people?.map((person) =>
              person.value === String(stored.personId) ? { ...person, hasUser: true } : person,
            ) ?? null,
        }));
      }
      if (temporaryPassword) {
        const account = stored.user as Record<string, unknown> | null | undefined;
        setIssuedPassword({
          name: config.itemLabel(stored),
          username: String(stored.username ?? account?.username ?? ''),
          password: temporaryPassword,
        });
      }
      setDialogMode(null);
      setSelected(null);
      setFormErrors({});
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<void>(`/${domain.apiResource}/${String(deleteTarget.id)}`, {
        method: 'DELETE',
      });
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DomainGuard resource={resource}>
      <section className="mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Domínio</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{domain.label}</h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">{domain.description}</p>
          </div>
          {canCreate && (
            <button type="button" className={`btn-primary min-h-11 ${buttonMotion}`} onClick={openCreate}>
              Novo cadastro
            </button>
          )}
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--muted)]">Seu perfil</p>
            <p className="text-lg font-semibold">{roleLabels(roles)}</p>
          </article>
          <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--muted)]">Registros visíveis</p>
            <p className="text-lg font-semibold">{loading ? '…' : rows.length}</p>
          </article>
          <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--muted)]">Escrita</p>
            <p className="text-lg font-semibold">{canCreate ? 'Permitida' : 'Somente leitura'}</p>
          </article>
        </div>

        <article className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="p-4">
            <TableView
              tableId={resource}
              data={rows}
              columns={tableColumns}
              getRowId={(row, index) => String(row.id ?? index)}
              loading={loading}
              error={error}
              onRefresh={() => void fetchItems()}
              globalFilterLabel={`Buscar ${domain.label.toLocaleLowerCase('pt-BR')}`}
              emptyMessage={`Nenhum registro de ${domain.label.toLocaleLowerCase('pt-BR')} encontrado.`}
              noResultsMessage="Nenhum registro corresponde à busca ou aos filtros."
              getRowLabel={(row) => config.itemLabel(row)}
              renderRowActions={renderRowActions}
              toolbarLabels={{ section: `Controles de ${domain.label.toLocaleLowerCase('pt-BR')}` }}
            />
          </div>
        </article>
      </section>

      {dialogMode && (
        <EntityDialog
          open
          title={
            dialogMode === 'create'
              ? `Novo ${config.singular}`
              : dialogMode === 'edit'
                ? `Editar ${config.itemLabel(selected ?? {})}`
                : config.itemLabel(selected ?? {})
          }
          size="xl"
          placement="bottom"
          onClose={closeDialog}
        >
          <EntityForm
            fields={config.fields.filter(
              (field) =>
                (field.name !== 'createUser' && field.name !== 'username') ||
                resource === 'users' ||
                can(roles, 'users', 'create', permissions),
            )}
            values={values}
            errors={formErrors}
            readOnly={dialogMode === 'view'}
            editing={dialogMode === 'edit'}
            saving={saving}
            roleChoices={roleChoices}
            dynamicChoices={choices}
            rolesLocked={resource === 'users' && !managesRoles}
            onChange={(name, value) => {
              setValues((current) => ({ ...current, [name]: value }));
              setFormErrors((current) => ({ ...current, [name]: '' }));
            }}
            onClose={closeDialog}
            onSubmit={handleSave}
            onEdit={
              dialogMode === 'view' && canUpdate && selected
                ? () => openItem(selected, 'edit')
                : undefined
            }
          />
        </EntityDialog>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <h2 id="delete-title" className="text-xl font-semibold">Excluir {config.singular}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Confirma a exclusão de <strong>{config.itemLabel(deleteTarget)}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className={`btn-ghost min-h-11 ${buttonMotion}`} disabled={saving} onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className={`btn-danger min-h-11 ${buttonMotion}`} disabled={saving} onClick={() => void handleDelete()}>
                {saving ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {issuedPassword && (
        <div className="fixed inset-0 z-[210] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="issued-password-title">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <h2 id="issued-password-title" className="text-xl font-semibold">Acesso criado</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Envie o usuário e a senha inicial para <strong>{issuedPassword.name}</strong>. A senha não será mostrada
              de novo e precisa ser trocada no primeiro acesso.
            </p>
            <label className="mt-4 flex flex-col gap-1.5 text-sm">
              Usuário
              <input readOnly value={issuedPassword.username} className={`min-h-11 font-mono ${controlMotion}`} onFocus={(event) => event.currentTarget.select()} />
            </label>
            <label className="mt-3 flex flex-col gap-1.5 text-sm">
              Senha
              <input readOnly value={issuedPassword.password} className={`min-h-11 font-mono ${controlMotion}`} onFocus={(event) => event.currentTarget.select()} />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className={`btn-outline-primary min-h-11 ${buttonMotion}`}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`Usuário: ${issuedPassword.username}\nSenha: ${issuedPassword.password}`)
                    .catch(() => undefined);
                }}
              >
                Copiar
              </button>
              <button type="button" className={`btn-primary min-h-11 ${buttonMotion}`} onClick={() => setIssuedPassword(null)}>
                Já anotei
              </button>
            </div>
          </div>
        </div>
      )}
    </DomainGuard>
  );
}

function songHasScore(row: Record<string, unknown>): boolean {
  return Array.isArray(row.scores) && row.scores.some((score) => {
    if (!score || typeof score !== 'object') return false;
    const url = (score as { url?: unknown }).url;
    return typeof url === 'string' && url.length > 0;
  });
}

function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={disabled ? 'Não é possível excluir o usuário da sessão.' : label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`group inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-30 ${buttonMotion} ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)]'
      }`}
    >
      <span className={`material-icons text-lg ${iconMotion}`} aria-hidden="true">{icon}</span>
    </button>
  );
}

function validateValues(fields: CrudField[], values: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (field.showWhen && !field.showWhen(values)) continue;
    const value = values[field.name];
    const empty =
      value === undefined || value === null || (Array.isArray(value) ? value.length === 0 : String(value).trim() === '');
    if (field.required && empty) {
      errors[field.name] = `${field.label} é obrigatório.`;
      continue;
    }
    const customError = field.validate?.(value, values);
    if (customError) errors[field.name] = customError;
  }
  return errors;
}

function uniqueFieldsForResource(resource: CrudResource): string[] {
  if (resource === 'users') return ['username'];
  if (resource === 'people') return ['email', 'document.number'];
  if (resource === 'media') return ['slug'];
  if (resource === 'patrimony') return ['code'];
  if (resource === 'instruments') return ['name'];
  return [];
}

function normalizeUniqueValue(value: unknown): string {
  return String(value ?? '')
    .replace(/[.\-\s/]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function withAudit(
  values: Record<string, unknown>,
  current?: Record<string, unknown>,
): Record<string, unknown> {
  const now = new Date().toISOString();
  return { ...values, createdAt: current?.createdAt ?? now, updatedAt: now };
}

function formatCell(
  row: Record<string, unknown>,
  column: CrudColumn,
  roleChoices: CrudOption[] | null,
  personChoices: PersonChoice[] | null,
): string {
  const value = getValue(row, column.path);
  if (column.path === 'hasScore') return songHasScore(row) ? 'Sim' : 'Não';
  if (column.path === 'updatedBy') return value == null || value === '' ? 'system' : String(value);
  if (column.path === 'visibility') {
    if (value === 'public') return 'Pública';
    const who = [
      row.visibleToStudents ? 'alunos' : '',
      row.visibleToMusicians ? 'músicos' : '',
    ].filter(Boolean);
    return who.length > 0 ? `Privada · ${who.join(' e ')}` : 'Privada';
  }
  if (column.format === 'status') {
    const labels: Record<string, string> = {
      active: 'Ativo',
      inactive: 'Inativo',
      available: 'Disponível',
      in_use: 'Em uso',
      maintenance: 'Manutenção',
      retired: 'Baixado',
      draft: 'Rascunho',
      scheduled: 'Agendada',
      done: 'Realizada',
      cancelled: 'Cancelada',
      published: 'Publicado',
      public: 'Pública',
      private: 'Privada',
    };
    return labels[String(value)] ?? String(value ?? '—');
  }
  if (column.format === 'boolean') return value ? 'Sim' : 'Não';
  if (column.format === 'count') return String(Array.isArray(value) ? value.length : 0);
  if (column.format === 'currency') {
    return typeof value === 'number'
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
      : '—';
  }
  if (column.format === 'date' || column.format === 'datetime') {
    if (!value) return '—';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '—';
    return column.format === 'date'
      ? date.toLocaleDateString('pt-BR')
      : date.toLocaleString('pt-BR');
  }
  if (column.format === 'roles' && Array.isArray(value)) {
    return value
      .map((role) => roleChoices?.find((option) => option.value === String(role))?.label ?? roleLabels([String(role)]))
      .join(', ');
  }
  if ((column.path === 'personId' || column.path === 'assignedPersonId' || column.path === 'guardianId') && value) {
    return personChoices?.find((option) => option.value === String(value))?.label ?? 'Vinculada';
  }
  return value == null || value === '' ? '—' : String(value);
}
