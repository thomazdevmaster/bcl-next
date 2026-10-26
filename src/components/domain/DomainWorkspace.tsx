"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { EntityDialog } from "@/components/shared/EntityDialog";
import { TableRowActions } from "@/components/tables/core/TableRowActions";
import { TableView } from "@/components/tables/core/TableView";
import { createCrudTableRowActions } from "@/components/tables/core/table-actions";
import { useAuth } from "@/contexts/AuthContext";
import { can } from "@/core/auth/permissions";
import type { CrudResource } from "@/core/auth/permissions";
import { hasRole, roleLabels } from "@/core/auth/roles";
import { getDomain } from "@/domains/catalog";
import {
  type CrudColumn,
  type CrudField,
  type CrudOption,
  type CrudOptionSource,
  getCrudConfig,
  getValue,
} from "@/domains/crudConfig";
import type { Person } from "@/domains/people/types";
import { filterPeopleForRole } from "@/domains/people/visibility";
import { filterSongRecordsForCatalog } from "@/domains/songs/catalogAccess";
import { gestaoDeepLinkParam } from "@/lib/deepLink/gestaoDeepLinkParams";
import { useGestaoDeepLink } from "@/lib/deepLink/useGestaoDeepLink";
import { apiFetch } from "@/lib/api";
import { sealPassword } from "@/lib/passwordCipher";
import { failureMessage, userFacingError } from "@/lib/userMessages";

import { DomainGuard } from "./DomainGuard";
import { EntityForm, type EntityFormDynamicChoices } from "./EntityForm";
import { createDomainTableColumns } from "./table-columns";
import { UsersWorkspace } from "./users/UsersWorkspace";

interface DomainWorkspaceProps {
  resource: CrudResource;
  /** @deprecated Columns and fields now come from the domain CRUD configuration. */
  entityFields?: string[];
}

type DialogMode = "create" | "view" | "edit" | null;

const buttonMotion =
  "transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";
const controlMotion =
  "transition-[border-color,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none";

/** Opção de pessoa com o que o formulário precisa para filtrar (sem conta, não é a própria). */
interface PersonChoice extends CrudOption {
  hasUser: boolean;
}

interface IssuedPassword {
  name: string;
  username: string;
  password: string;
}

export function DomainWorkspace(props: DomainWorkspaceProps) {
  if (props.resource === "users") return <UsersWorkspace />;
  return <GenericDomainWorkspace {...props} />;
}

function GenericDomainWorkspace({ resource }: DomainWorkspaceProps) {
  const domain = getDomain(resource);
  const config = getCrudConfig(resource);
  const { roles, permissions, user } = useAuth();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );
  const [values, setValues] = useState<Record<string, unknown>>(
    config.defaults,
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<
    Record<string, unknown>[] | null
  >(null);
  const [issuedPassword, setIssuedPassword] = useState<IssuedPassword | null>(
    null,
  );
  const [sendPublicationNotification, setSendPublicationNotification] =
    useState(true);
  const [roleChoices, setRoleChoices] = useState<CrudOption[] | null>(null);
  const [choices, setChoices] = useState<EntityFormDynamicChoices>({
    people: null,
    instruments: null,
  });
  const canCreate = can(roles, resource, "create", permissions);
  const canUpdate = can(roles, resource, "update", permissions);
  const canDelete = can(roles, resource, "delete", permissions);
  const managesRoles = hasRole(roles, "admin");

  const sources = useMemo(() => {
    const needed = new Set<CrudOptionSource>();
    for (const field of config.fields) {
      if (field.optionsSource) needed.add(field.optionsSource);
    }
    return needed;
  }, [config.fields]);
  const needsPeople =
    sources.has("people") || sources.has("people-without-user");
  const needsInstruments = sources.has("instruments");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let rows = await apiFetch<Record<string, unknown>[]>(
        `/${domain.apiResource}`,
      );
      if (resource === "songs") {
        rows = filterSongRecordsForCatalog(rows, roles, permissions);
      }
      setItems(rows);
    } catch (caught) {
      setError(
        failureMessage(
          caught,
          "Não foi possível carregar os registros. Confirme se a API está rodando.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [domain.apiResource, permissions, resource, roles]);

  useEffect(() => {
    // A listagem precisa iniciar quando o workspace monta.
     
    void fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (resource !== "users" || !managesRoles) return;
    let active = true;
    apiFetch<Array<{ code: string; name: string }>>("/roles")
      .then((data) => {
        if (active)
          setRoleChoices(
            data.map((role) => ({ value: role.code, label: role.name })),
          );
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
    apiFetch<Array<Pick<Person, "id" | "firstName" | "lastName" | "userId">>>(
      "/people",
    )
      .then((data) => {
        if (!active) return;
        setChoices((current) => ({
          ...current,
          people: data.map((person) => ({
            value: String(person.id),
            label:
              `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() ||
              String(person.id),
            hasUser: person.userId != null && person.userId !== "",
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
    apiFetch<
      Array<{
        id: string | number;
        name?: string;
        tuning?: string;
        status?: string;
      }>
    >("/instruments")
      .then((data) => {
        if (!active) return;
        setChoices((current) => ({
          ...current,
          instruments: data
            .filter((item) => item.status !== "inactive")
            .map((item) => ({
              value: String(item.id),
              label:
                [item.name, item.tuning].filter(Boolean).join(" · ") ||
                String(item.id),
            })),
        }));
      })
      .catch(() => {
        if (active)
          setChoices((current) => ({ ...current, instruments: null }));
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
        label:
          `${String(saved.firstName ?? "")} ${String(saved.lastName ?? "")}`.trim() ||
          id,
        hasUser: saved.userId != null && saved.userId !== "",
      };
      const exists = current.people.some((person) => person.value === id);
      return {
        ...current,
        people: exists
          ? current.people.map((person) =>
              person.value === id ? entry : person,
            )
          : [...current.people, entry],
      };
    });
  };

  const rows = useMemo(() => {
    let visibleItems = config.filter ? items.filter(config.filter) : items;
    if (resource === "people") {
      visibleItems = filterPeopleForRole(
        visibleItems as unknown as Person[],
        roles,
        permissions,
      ) as unknown as Record<string, unknown>[];
    }
    return visibleItems;
  }, [config, items, permissions, resource, roles]);

  const tableColumns = useMemo(
    () =>
      createDomainTableColumns(
        config.columns,
        (row, column) => formatCell(row, column, roleChoices, choices.people),
        resource,
      ),
    [choices.people, config.columns, resource, roleChoices],
  );

  const openCreate = () => {
    setSelected(null);
    setValues({ ...config.defaults });
    setSendPublicationNotification(true);
    setFormErrors({});
    setDialogMode("create");
  };

  const openItem = useCallback(
    (item: Record<string, unknown>, mode: "view" | "edit") => {
      setSelected(item);
      setSendPublicationNotification(true);
      setValues({
        ...config.defaults,
        ...(config.toForm ? config.toForm(item) : item),
      });
      setFormErrors({});
      setDialogMode(mode);
    },
    [config],
  );

  useGestaoDeepLink({
    param: gestaoDeepLinkParam(resource),
    items,
    loading,
    onOpen: openItem,
  });

  const getRowActions = useCallback(
    (row: Record<string, unknown>, includeView: boolean, mobile = false) => {
      const hasScore = resource === "songs" && songHasScore(row);
      return createCrudTableRowActions({
        extras:
          resource === "songs" && (hasScore || !mobile)
            ? [
                {
                  id: "study",
                  label: "Estudar",
                  icon: "school",
                  href: hasScore ? `/study/${row.id}` : undefined,
                  onSelect: () => window.location.assign(`/study/${row.id}`),
                  disabled: !hasScore,
                  disabledTitle: "Sem partitura",
                },
              ]
            : [],
        view: includeView
          ? { onSelect: () => openItem(row, "view") }
          : undefined,
        edit: canUpdate ? { onSelect: () => openItem(row, "edit") } : undefined,
        remove: canDelete
          ? {
              onSelect: () => setDeleteTarget(row),
              disabled:
                resource === "users" && String(row.id) === String(user?.id),
              disabledTitle: "Não é possível excluir o usuário da sessão.",
            }
          : undefined,
      });
    },
    [canDelete, canUpdate, openItem, resource, user?.id],
  );

  const renderRowActions = useCallback(
    (row: Record<string, unknown>) => (
      <TableRowActions actions={getRowActions(row, false)} />
    ),
    [getRowActions],
  );

  const dismissEntityDialog = useCallback(() => {
    setDialogMode(null);
    setSelected(null);
    setFormErrors({});
  }, []);

  const closeDialog = () => {
    if (saving) return;
    dismissEntityDialog();
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateValues(config.fields, values);

    if (resource === "users" && !managesRoles) {
      const previous = Array.isArray(selected?.roles)
        ? selected.roles.map(String).sort()
        : [];
      const next = Array.isArray(values.roles)
        ? values.roles.map(String).sort()
        : [];
      if (previous.join("|") !== next.join("|")) {
        errors.roles =
          "Somente um administrador pode vincular ou desvincular papéis.";
      }
    }

    for (const uniqueField of uniqueFieldsForResource(resource)) {
      const candidate = normalizeUniqueValue(values[uniqueField]);
      if (
        candidate &&
        items.some(
          (item) =>
            item.id !== selected?.id &&
            normalizeUniqueValue(getValue(item, uniqueField)) === candidate,
        )
      ) {
        errors[uniqueField] = "Já existe um registro com este valor.";
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);
    let didPersist = false;
    try {
      const mapped = config.toPayload
        ? config.toPayload(values, selected ?? undefined)
        : withAudit(values, selected ?? undefined);
      const payload: Record<string, unknown> = dialogMode === "create" ? mapped : { ...selected, ...mapped };
      if (resource === "presentations") {
        payload.notifyAll = sendPublicationNotification;
      }
      // Senhas de usuário são cifradas antes de serem enviadas à API.
      if (typeof payload.password === "string") {
        if (!payload.password) {
          delete payload.password;
        } else {
          payload.password = await sealPassword(payload.password);
        }
      }
      const endpoint =
        dialogMode === "create"
          ? `/${domain.apiResource}`
          : `/${domain.apiResource}/${String(selected?.id)}`;
      const saved = await apiFetch<Record<string, unknown>>(endpoint, {
        method: dialogMode === "create" ? "POST" : "PUT",
        body: JSON.stringify(payload),
      });
      const temporaryPassword =
        typeof saved.temporaryPassword === "string"
          ? saved.temporaryPassword
          : "";
      const stored = { ...saved };
      delete stored.temporaryPassword;
      setItems((current) =>
        dialogMode === "create"
          ? [...current, stored]
          : current.map((item) => (item.id === stored.id ? stored : item)),
      );
      if (resource === "people") refreshPeopleChoices(stored);
      if (resource === "users" && dialogMode === "create") {
        setChoices((current) => ({
          ...current,
          people:
            current.people?.map((person) =>
              person.value === String(stored.personId)
                ? { ...person, hasUser: true }
                : person,
            ) ?? null,
        }));
      }
      if (temporaryPassword) {
        const account = stored.user as
          Record<string, unknown> | null | undefined;
        setIssuedPassword({
          name: config.itemLabel(stored),
          username: String(stored.username ?? account?.username ?? ""),
          password: temporaryPassword,
        });
      }
      didPersist = true;
    } catch (caught) {
      setError(userFacingError(caught));
    } finally {
      setSaving(false);
      if (didPersist) dismissEntityDialog();
    }
  };

  const handleDelete = async () => {
    const targets = bulkDeleteTargets ?? (deleteTarget ? [deleteTarget] : []);
    if (targets.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        targets.map((target) =>
          apiFetch<void>(`/${domain.apiResource}/${String(target.id)}`, {
            method: "DELETE",
          }),
        ),
      );
      const deletedIds = targets
        .filter((_, index) => results[index].status === "fulfilled")
        .map((target) => target.id);
      const failedTargets = targets.filter(
        (_, index) => results[index].status === "rejected",
      );
      if (deletedIds.length > 0) {
        setItems((current) =>
          current.filter((item) => !deletedIds.includes(item.id)),
        );
      }
      if (failedTargets.length > 0) {
        const failure = results.find((result) => result.status === "rejected");
        setError(
          userFacingError(
            failure?.status === "rejected" ? failure.reason : undefined,
            `Não foi possível excluir ${failedTargets.length} registro(s).`,
          ),
        );
        if (bulkDeleteTargets) setBulkDeleteTargets(failedTargets);
      } else {
        setBulkDeleteTargets(null);
        setDeleteTarget(null);
      }
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
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Domínio
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {domain.label}
            </h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">
              {domain.description}
            </p>
          </div>
          {canCreate && (
            <div className="hidden min-[960px]:block">
              <button
                type="button"
                className={`btn-primary min-h-11 ${buttonMotion}`}
                onClick={openCreate}
              >
                Novo cadastro
              </button>
            </div>
          )}
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--muted)]">Seu perfil</p>
            <p className="text-lg font-semibold">{roleLabels(roles)}</p>
          </article>
          <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--muted)]">Registros visíveis</p>
            <p className="text-lg font-semibold">
              {loading ? "…" : rows.length}
            </p>
          </article>
          <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--muted)]">Escrita</p>
            <p className="text-lg font-semibold">
              {canCreate ? "Permitida" : "Somente leitura"}
            </p>
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
              globalFilterLabel={`Buscar ${domain.label.toLocaleLowerCase("pt-BR")}`}
              emptyMessage={`Nenhum registro de ${domain.label.toLocaleLowerCase("pt-BR")} encontrado.`}
              noResultsMessage="Nenhum registro corresponde à busca ou aos filtros."
              getRowLabel={(row) => config.itemLabel(row)}
              mobilePrimaryLabel={
                resource === "people" ? "Informações de" : undefined
              }
              getMobilePrimary={
                resource === "users"
                  ? (row) =>
                      String(
                        row.personName ?? row.name ?? row.username ?? "Usuário",
                      )
                  : resource === "people"
                    ? (row) =>
                        `${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`.trim()
                    : resource === "patrimony"
                      ? (row) => String(row.name ?? "—")
                      : resource === "songs"
                        ? (row) => String(row.title ?? "—")
                        : undefined
              }
              getMobilePrimaryLabel={
                resource === "users"
                  ? (row) => String(row.username ?? "Usuário")
                  : resource === "patrimony"
                    ? (row) => String(row.code ?? "Código")
                    : resource === "songs"
                      ? (row) => String(row.composer ?? "Compositor")
                      : undefined
              }
              mobilePrimaryAction={
                canCreate ? (
                  <button
                    type="button"
                    className={"btn-primary min-h-11 w-full " + buttonMotion}
                    onClick={openCreate}
                  >
                    Novo cadastro
                  </button>
                ) : undefined
              }
              mobileSelectionEnabled={canDelete}
              onDeleteSelected={(targets, clearSelection) => {
                if (!canDelete || targets.length === 0) return;
                clearSelection();
                setBulkDeleteTargets(targets);
                setDeleteTarget(null);
              }}
              renderRowActions={renderRowActions}
              renderMobileRowActions={(row) => getRowActions(row, false, true)}
              toolbarLabels={{
                section: `Controles de ${domain.label.toLocaleLowerCase("pt-BR")}`,
              }}
            />
          </div>
        </article>
      </section>

      <EntityDialog
        open={dialogMode !== null}
        title={
          dialogMode === "create"
            ? `Novo ${config.singular}`
            : dialogMode === "edit"
              ? `Editar ${config.itemLabel(selected ?? {})}`
              : dialogMode === "view"
                ? config.itemLabel(selected ?? {})
                : config.singular
        }
        size="xl"
        placement="bottom"
        closeOnBackdropClick
        onClose={closeDialog}
      >
        {dialogMode ? (
          <EntityForm
            fields={config.fields.filter(
              (field) =>
                (field.name !== "createUser" && field.name !== "username") ||
                resource === "users" ||
                can(roles, "users", "create", permissions),
            )}
            values={values}
            errors={formErrors}
            readOnly={dialogMode === "view"}
            editing={dialogMode === "edit"}
            saving={saving}
            roleChoices={roleChoices}
            dynamicChoices={choices}
            rolesLocked={resource === "users" && !managesRoles}
            onChange={(name, value) => {
              setValues((current) => ({ ...current, [name]: value }));
              setFormErrors((current) => ({ ...current, [name]: "" }));
            }}
            onClose={closeDialog}
            onSubmit={handleSave}
            extraContent={
              resource === "presentations" &&
              dialogMode !== "view" &&
              (dialogMode === "create" ||
                selected?.status !== "scheduled" ||
                selected?.isPublic !== true) ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[var(--primary)]"
                      checked={sendPublicationNotification}
                      onChange={(event) =>
                        setSendPublicationNotification(event.target.checked)
                      }
                    />
                    <span>
                      Notificar todas as contas quando esta apresentação for
                      publicada
                    </span>
                  </label>
                  <p className="text-sm text-[var(--muted)]">
                    Só envia ao salvar como agendada e pública; o padrão é
                    enviar.
                  </p>
                </div>
              ) : null
            }
            onEdit={
              dialogMode === "view" && canUpdate && selected
                ? () => openItem(selected, "edit")
                : undefined
            }
          />
        ) : null}
      </EntityDialog>

      {(deleteTarget || bulkDeleteTargets) && (
        <ConfirmationDialog
          open
          title={
            bulkDeleteTargets
              ? `Excluir ${bulkDeleteTargets.length} registro(s)`
              : `Excluir ${config.singular}`
          }
          description={
            bulkDeleteTargets
              ? "Confirma a exclusão dos registros selecionados? Esta ação não pode ser desfeita."
              : `Confirma a exclusão de ${config.itemLabel(deleteTarget ?? {})}? Esta ação não pode ser desfeita.`
          }
          confirmLabel={saving ? "Excluindo…" : "Excluir"}
          danger
          busy={saving}
          closeOnBackdropClick={!saving}
          onClose={() => {
            setDeleteTarget(null);
            setBulkDeleteTargets(null);
          }}
          onConfirm={() => void handleDelete()}
        />
      )}

      {issuedPassword && (
        <EntityDialog
          open
          title="Acesso criado"
          description={`Envie o usuário e a senha inicial para ${issuedPassword.name}. A senha não será mostrada de novo e precisa ser trocada no primeiro acesso.`}
          size="sm"
          onClose={() => setIssuedPassword(null)}
        >
          <div className="max-h-[70dvh] overflow-y-auto p-6">
            <label className="mt-4 flex flex-col gap-1.5 text-sm">
              Usuário
              <input
                readOnly
                value={issuedPassword.username}
                className={`min-h-11 font-mono ${controlMotion}`}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <label className="mt-3 flex flex-col gap-1.5 text-sm">
              Senha
              <input
                readOnly
                value={issuedPassword.password}
                className={`min-h-11 font-mono ${controlMotion}`}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className={`btn-outline-primary min-h-11 ${buttonMotion}`}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(
                      `Usuário: ${issuedPassword.username}\nSenha: ${issuedPassword.password}`,
                    )
                    .catch(() => undefined);
                }}
              >
                Copiar
              </button>
              <button
                type="button"
                className={`btn-primary min-h-11 ${buttonMotion}`}
                onClick={() => setIssuedPassword(null)}
              >
                Já anotei
              </button>
            </div>
          </div>
        </EntityDialog>
      )}
    </DomainGuard>
  );
}

function songHasScore(row: Record<string, unknown>): boolean {
  return (
    Array.isArray(row.scores) &&
    row.scores.some((score) => {
      if (!score || typeof score !== "object") return false;
      const url = (score as { url?: unknown }).url;
      return typeof url === "string" && url.length > 0;
    })
  );
}

function validateValues(
  fields: CrudField[],
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (field.showWhen && !field.showWhen(values)) continue;
    const value = values[field.name];
    const empty =
      value === undefined ||
      value === null ||
      (Array.isArray(value) ? value.length === 0 : String(value).trim() === "");
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
  if (resource === "users") return ["username"];
  if (resource === "people") return ["email", "document.number"];
  if (resource === "media") return ["slug"];
  if (resource === "patrimony") return ["code"];
  if (resource === "instruments") return ["name"];
  return [];
}

function normalizeUniqueValue(value: unknown): string {
  return String(value ?? "")
    .replace(/[.\-\s/]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
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
  if (column.path === "hasScore") return songHasScore(row) ? "Sim" : "Não";
  if (column.path === "createdBy")
    return value == null || value === "" ? "system" : String(value);
  if (column.path === "visibility") {
    if (value === "public") return "Pública";
    const who = [
      row.visibleToStudents ? "alunos" : "",
      row.visibleToMusicians ? "músicos" : "",
    ].filter(Boolean);
    return who.length > 0 ? `Privada · ${who.join(" e ")}` : "Privada";
  }
  if (column.format === "status") {
    const labels: Record<string, string> = {
      active: "Ativo",
      inactive: "Inativo",
      available: "Disponível",
      in_use: "Em uso",
      maintenance: "Manutenção",
      retired: "Baixado",
      draft: "Rascunho",
      scheduled: "Agendada",
      done: "Realizada",
      cancelled: "Cancelada",
      published: "Publicado",
      public: "Pública",
      private: "Privada",
      none: "—",
      processing: "Processando",
      ready: "Pronta",
      failed: "Falhou",
      skipped: "Sem áudio",
    };
    return labels[String(value)] ?? String(value ?? "—");
  }
  if (column.format === "boolean") return value ? "Sim" : "Não";
  if (column.format === "count")
    return String(Array.isArray(value) ? value.length : 0);
  if (column.format === "currency") {
    return typeof value === "number"
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value)
      : "—";
  }
  if (column.format === "date" || column.format === "datetime") {
    if (!value) return "—";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "—";
    return column.format === "date"
      ? date.toLocaleDateString("pt-BR")
      : date.toLocaleString("pt-BR");
  }
  if (column.format === "roles" && Array.isArray(value)) {
    return value
      .map(
        (role) =>
          roleChoices?.find((option) => option.value === String(role))?.label ??
          roleLabels([String(role)]),
      )
      .join(", ");
  }
  if (
    (column.path === "personId" ||
      column.path === "assignedPersonId" ||
      column.path === "guardianId") &&
    value
  ) {
    return (
      personChoices?.find((option) => option.value === String(value))?.label ??
      "Vinculada"
    );
  }
  return value == null || value === "" ? "—" : String(value);
}
