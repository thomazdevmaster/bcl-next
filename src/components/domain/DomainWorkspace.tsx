'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
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
import { DomainGuard } from './DomainGuard';

interface DomainWorkspaceProps {
  resource: CrudResource;
  /** @deprecated Columns and fields now come from the domain CRUD configuration. */
  entityFields?: string[];
}

type DialogMode = 'create' | 'view' | 'edit' | null;

/** Opção de pessoa com o que o formulário precisa para filtrar (sem conta, não é a própria). */
interface PersonChoice extends CrudOption {
  hasUser: boolean;
}

interface DynamicChoices {
  people: PersonChoice[] | null;
  instruments: CrudOption[] | null;
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
  const [search, setSearch] = useState('');
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(config.defaults);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [issuedPassword, setIssuedPassword] = useState<IssuedPassword | null>(null);
  const [roleChoices, setRoleChoices] = useState<CrudOption[] | null>(null);
  const [choices, setChoices] = useState<DynamicChoices>({ people: null, instruments: null });
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

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<Record<string, unknown>[]>(`/${domain.apiResource}`)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((caught: unknown) => {
        if (active) setError(failureMessage(caught, 'Não foi possível carregar os registros. Confirme se a API está rodando.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [domain.apiResource]);

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

  // Instrumentos do patrimônio para o perfil de músico.
  useEffect(() => {
    if (!needsInstruments) return;
    let active = true;
    apiFetch<Array<{ id: string | number; name?: string; code?: string; category?: string }>>('/patrimony')
      .then((data) => {
        if (!active) return;
        setChoices((current) => ({
          ...current,
          instruments: data
            .filter((item) => item.category === 'instrument')
            .map((item) => ({
              value: String(item.id),
              label: [item.code, item.name].filter(Boolean).join(' · ') || String(item.id),
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
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedSearch) return visibleItems;
    return visibleItems.filter((item) =>
      config.columns.some((column) =>
        String(getValue(item, column.path) ?? '')
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch),
      ),
    );
  }, [config, items, permissions, resource, roles, search]);

  const openCreate = () => {
    setSelected(null);
    setValues({ ...config.defaults });
    setFormErrors({});
    setDialogMode('create');
  };

  const openItem = (item: Record<string, unknown>, mode: 'view' | 'edit') => {
    setSelected(item);
    setValues({
      ...config.defaults,
      ...(config.toForm ? config.toForm(item) : item),
    });
    setFormErrors({});
    setDialogMode(mode);
  };

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
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Domínio</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{domain.label}</h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">{domain.description}</p>
          </div>
          {canCreate && (
            <button type="button" className="btn-primary min-h-11" onClick={openCreate}>
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

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}

        <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] p-4">
            <label className="relative block max-w-md">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true">
                search
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Buscar ${domain.label.toLocaleLowerCase('pt-BR')}...`}
                aria-label={`Buscar ${domain.label.toLocaleLowerCase('pt-BR')}`}
                className="min-h-11 w-full pl-10"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--card-secondary)] text-[var(--muted)]">
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.path} className="px-4 py-3 font-medium">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={String(row.id ?? index)} className="border-t border-[var(--border)]">
                    {config.columns.map((column) => (
                      <td key={column.path} className="px-4 py-3">
                        {formatCell(row, column, roleChoices, choices.people)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
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
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-[var(--muted)]" colSpan={config.columns.length + 1}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {dialogMode && (
        <EntityDialog
          title={
            dialogMode === 'create'
              ? `Novo ${config.singular}`
              : dialogMode === 'edit'
                ? `Editar ${config.itemLabel(selected ?? {})}`
                : config.itemLabel(selected ?? {})
          }
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
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <h2 id="delete-title" className="text-xl font-semibold">Excluir {config.singular}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Confirma a exclusão de <strong>{config.itemLabel(deleteTarget)}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-ghost min-h-11" disabled={saving} onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-danger min-h-11" disabled={saving} onClick={() => void handleDelete()}>
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
              <input readOnly value={issuedPassword.username} className="min-h-11 font-mono" onFocus={(event) => event.currentTarget.select()} />
            </label>
            <label className="mt-3 flex flex-col gap-1.5 text-sm">
              Senha
              <input readOnly value={issuedPassword.password} className="min-h-11 font-mono" onFocus={(event) => event.currentTarget.select()} />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="btn-outline-primary min-h-11"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`Usuário: ${issuedPassword.username}\nSenha: ${issuedPassword.password}`)
                    .catch(() => undefined);
                }}
              >
                Copiar
              </button>
              <button type="button" className="btn-primary min-h-11" onClick={() => setIssuedPassword(null)}>
                Já anotei
              </button>
            </div>
          </div>
        </div>
      )}
    </DomainGuard>
  );
}

interface EntityDialogProps {
  title: string;
  fields: CrudField[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  readOnly: boolean;
  editing: boolean;
  saving: boolean;
  roleChoices: CrudOption[] | null;
  dynamicChoices: DynamicChoices;
  rolesLocked: boolean;
  onChange: (name: string, value: unknown) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit?: () => void;
}

function EntityDialog({
  title,
  fields,
  values,
  errors,
  readOnly,
  editing,
  saving,
  roleChoices,
  dynamicChoices,
  rolesLocked,
  onChange,
  onClose,
  onSubmit,
  onEdit,
}: EntityDialogProps) {
  const visibleFields = fields.filter((field) => !field.showWhen || field.showWhen(values));
  const hasSections = visibleFields.some((field) => field.section);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>, field: CrudField) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validExtension = /\.(xml|musicxml)$/i.test(file.name);
    if (!validExtension) {
      onChange(field.name, '');
      return;
    }
    const content = await file.text();
    const encoded = `data:${file.type || 'application/xml'};base64,${btoa(
      unescape(encodeURIComponent(content)),
    )}`;
    onChange(field.name, encoded);
    onChange('scoreFileName', file.name);
    onChange('scoreMimeType', file.type || 'application/xml');
  };

  let lastSection: string | undefined;

  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="entity-dialog-title">
      <div className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:px-6 sm:py-4">
          <h2 id="entity-dialog-title" className="text-xl font-semibold">{title}</h2>
          <button type="button" className="btn-ghost min-h-11 min-w-11" onClick={onClose} aria-label="Fechar">
            <span className="material-icons" aria-hidden="true">close</span>
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4 sm:p-6 md:grid-cols-2">
            {visibleFields.map((field) => {
              const value = values[field.name];
              const options = optionsForField(field, values, roleChoices, dynamicChoices);
              const fieldLocked =
                readOnly || (field.name === 'roles' && rolesLocked) || (editing && Boolean(field.lockOnEdit));
              const heading =
                hasSections && field.section && field.section !== lastSection ? field.section : null;
              if (field.section) lastSection = field.section;
              const wide = field.type === 'textarea' || field.type === 'xml' || field.type === 'multiselect';
              return (
                <FieldSlot key={field.name} heading={heading} wide={wide}>
                  {field.type === 'checkbox' ? (
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        disabled={fieldLocked}
                        className="h-5 w-5"
                        onChange={(event) => onChange(field.name, event.target.checked)}
                      />
                      <span className="font-medium">{field.label}</span>
                    </label>
                  ) : (
                    <span className="font-medium">
                      {field.label}
                      {field.required && <span className="text-red-600"> *</span>}
                    </span>
                  )}
                  {field.type === 'checkbox' ? null : field.type === 'multiselect' ? (
                    options.length === 0 ? (
                      <p className="rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
                        Nenhuma opção disponível.
                      </p>
                    ) : (
                      <div className="grid gap-1 rounded-md border border-[var(--border)] p-2 sm:grid-cols-2">
                        {options.map((option) => {
                          const selectedValues = Array.isArray(value) ? value.map(String) : [];
                          return (
                            <label key={option.value} className="flex min-h-11 items-center gap-2 px-1">
                              <input
                                type="checkbox"
                                className="h-5 w-5"
                                checked={selectedValues.includes(option.value)}
                                disabled={fieldLocked}
                                onChange={(event) =>
                                  onChange(
                                    field.name,
                                    event.target.checked
                                      ? [...selectedValues, option.value]
                                      : selectedValues.filter((item) => item !== option.value),
                                  )
                                }
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )
                  ) : field.type === 'select' ? (
                    <select
                      value={String(value ?? '')}
                      disabled={fieldLocked}
                      className="min-h-11"
                      onChange={(event) => onChange(field.name, event.target.value)}
                    >
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      rows={4}
                      value={String(value ?? '')}
                      readOnly={fieldLocked}
                      placeholder={field.placeholder}
                      onChange={(event) => onChange(field.name, event.target.value)}
                      className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2"
                    />
                  ) : field.type === 'xml' ? (
                    readOnly ? (
                      <p className="rounded-md bg-[var(--card-secondary)] px-3 py-2">
                        {String(values.scoreFileName || 'Nenhuma partitura anexada')}
                      </p>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept={field.accept}
                          onChange={(event) => void handleFile(event, field)}
                        />
                        {Boolean(values.scoreFileName) && (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Atual: {String(values.scoreFileName)}
                          </p>
                        )}
                      </div>
                    )
                  ) : (
                    <input
                      type={field.type ?? 'text'}
                      value={String(value ?? '')}
                      readOnly={fieldLocked}
                      placeholder={field.placeholder}
                      className="min-h-11"
                      autoComplete={field.type === 'password' ? 'new-password' : undefined}
                      inputMode={field.type === 'tel' ? 'tel' : undefined}
                      step={field.type === 'number' ? '0.01' : undefined}
                      onChange={(event) =>
                        onChange(
                          field.name,
                          field.type === 'tel'
                            ? formatPhoneNumber(event.target.value)
                            : field.format
                              ? field.format(event.target.value, values)
                              : event.target.value,
                        )
                      }
                    />
                  )}
                  {field.helpText && <span className="text-xs text-[var(--muted)]">{field.helpText}</span>}
                  {field.name === 'roles' && rolesLocked && (
                    <span className="text-xs text-[var(--muted)]">
                      Somente um administrador vincula ou desvincula papéis.
                    </span>
                  )}
                  {editing && field.lockOnEdit && (
                    <span className="text-xs text-[var(--muted)]">Definido na criação; não pode ser alterado.</span>
                  )}
                  {errors[field.name] && (
                    <span className="text-xs text-red-600" role="alert">
                      {errors[field.name]}
                    </span>
                  )}
                </FieldSlot>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
            <button type="button" className="btn-ghost min-h-11" disabled={saving} onClick={onClose}>
              Fechar
            </button>
            {readOnly && onEdit ? (
              <button type="button" className="btn-primary min-h-11" onClick={onEdit}>
                Editar
              </button>
            ) : !readOnly ? (
              <button type="submit" className="btn-primary min-h-11" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

/** Campo do formulário; quando abre uma seção nova, imprime o título antes dele. */
function FieldSlot({
  heading,
  wide,
  children,
}: {
  heading: string | null;
  wide: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {heading && (
        <h3 className="mt-2 border-b border-[var(--border)] pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)] first:mt-0 md:col-span-2">
          {heading}
        </h3>
      )}
      <div className={`flex flex-col gap-1.5 text-sm ${wide ? 'md:col-span-2' : ''}`}>{children}</div>
    </>
  );
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
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-[var(--color-brand-strong)] hover:bg-[var(--color-brand-soft)]'
      }`}
    >
      <span className="material-icons text-lg" aria-hidden="true">{icon}</span>
    </button>
  );
}

function optionsForField(
  field: CrudField,
  values: Record<string, unknown>,
  roleChoices: CrudOption[] | null,
  dynamic: DynamicChoices,
): CrudOption[] {
  const value = values[field.name];
  if (field.name === 'roles') return optionsForRoles(field, roleChoices, value);
  if (!field.optionsSource) return field.options ?? [];

  if (field.optionsSource === 'instruments') return dynamic.instruments ?? [];

  const selfId = values.id == null ? null : String(values.id);
  const selectedValue = value == null || value === '' ? null : String(value);
  const people = dynamic.people ?? [];
  const filtered = people.filter((person) => {
    if (person.value === selfId) return false;
    if (field.optionsSource === 'people-without-user') {
      return !person.hasUser || person.value === selectedValue;
    }
    return true;
  });
  const options: CrudOption[] = [
    { value: '', label: field.required ? 'Selecione…' : 'Nenhuma' },
    ...filtered.map(({ value: id, label }) => ({ value: id, label })),
  ];
  if (selectedValue && !options.some((option) => option.value === selectedValue)) {
    options.push({ value: selectedValue, label: `Pessoa #${selectedValue}` });
  }
  return options;
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
  if (resource === 'patrimony' || resource === 'instruments') return ['code'];
  return [];
}

function normalizeUniqueValue(value: unknown): string {
  return String(value ?? '')
    .replace(/[.\-\s/]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function withAudit(
  values: Record<string, unknown>,
  current?: Record<string, unknown>,
): Record<string, unknown> {
  const now = new Date().toISOString();
  return { ...values, createdAt: current?.createdAt ?? now, updatedAt: now };
}

function optionsForRoles(field: CrudField, loaded: CrudOption[] | null, value: unknown): CrudOption[] {
  const base = loaded ?? field.options ?? [];
  const selected = Array.isArray(value) ? value.map(String) : [];
  const missing = selected
    .filter((code) => !base.some((option) => option.value === code))
    .map((code) => ({ value: code, label: code }));
  return [...base, ...missing];
}

function formatCell(
  row: Record<string, unknown>,
  column: CrudColumn,
  roleChoices: CrudOption[] | null,
  personChoices: PersonChoice[] | null,
): string {
  const value = getValue(row, column.path);
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
