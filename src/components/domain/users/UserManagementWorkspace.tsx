"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { sealPassword } from "@/lib/passwordCipher";
import { failureMessage, userFacingError } from "@/lib/userMessages";
import { usesRemoteApi } from "@/core/auth/accessToken";
import { can } from "@/core/auth/permissions";
import { hasRole, roleLabels } from "@/core/auth/roles";
import { useAuth } from "@/contexts/AuthContext";
import { getDomain } from "@/domains/catalog";
import {
  getCrudConfig,
  getValue,
  type CrudColumn,
  type CrudField,
  type CrudOption,
  type CrudOptionSource,
} from "@/domains/crudConfig";
import type { CrudResource } from "@/core/auth/permissions";
import { filterPeopleForRole } from "@/domains/people/visibility";
import type { Person } from "@/domains/people/types";
import { isPersonUnderage } from "@/domains/people/types";
import { TableView } from "@/components/tables/core/TableView";
import { TableRowActions } from "@/components/tables/core/TableRowActions";
import { createCrudTableRowActions } from "@/components/tables/core/table-actions";
import { TableMobileIconAction } from "@/components/tables/core/TableMobileIconAction";
import { EntityDialog } from "@/components/shared/EntityDialog";
import { IconSelect } from "@/components/shared/IconSelect";
import { FormStageActions } from "@/components/forms/FormStageActions";
import { FormStageProgress, type FormStageStatus } from "@/components/forms/FormStageProgress";
import {
  EntityForm as UserManagementForm,
  type EntityFormDynamicChoices as UserManagementFormDynamicChoices,
} from "./UserManagementForm";
import type { PersonalContactFormHandlers } from "./UserPersonalContactStage";
import { NEW_GUARDIAN_VALUE, type GuardianStageHandlers } from "./UserGuardianStage";
import type { ProfilesStageHandlers } from "./UserProfilesStage";
import type { AccessStageHandlers } from "./UserAccessStage";
import type { PermissionsStageHandlers } from "./UserPermissionsStage";
import { personDetailsSchema, type PersonDetailsFormValues } from "@/domains/users/schemas/person-details.schema";
import { guardianSchema } from "@/domains/users/schemas/guardian.schema";
import { personProfilesSchema } from "@/domains/users/schemas/person-profiles.schema";
import { accessSchema } from "@/domains/users/schemas/access.schema";
import { permissionsSchema } from "@/domains/users/schemas/permissions.schema";
import { createDomainTableColumns } from "@/components/domain/table-columns";
import { tableFeatures } from "@/components/tables/core/table-features";
import type { TableColumnDef } from "@/components/tables/core/table-features";
import {
  getAdministrativeCompletionStatuses,
  evaluateAdministrativeCompletion,
  type AdministrativeCompletionStatus,
} from "@/domains/users/administrativeCompletion";

interface UserManagementWorkspaceProps {
  resource: CrudResource;
  /** Shows only the real create action and its dialog, for focused workflows. */
  createOnly?: boolean;
  hideCreateAction?: boolean;
  createButtonFullWidth?: boolean;
  createButtonLabel?: string;
  createOnlyHeading?: string;
  hideDomainHeading?: boolean;
  createDialogTitle?: string;
  createInitialValues?: Record<string, unknown>;
  /** Combines a new person form with a new account form in one dialog. */
  combinedUser?: boolean;
  refreshKey?: number;
  onCreated?: () => void;
  onCreateHandlerReady?: (handler: (() => void) | null) => void;
  mobilePrimaryAction?: ReactNode;
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

const userTableColumnHelper = createColumnHelper<typeof tableFeatures, Record<string, unknown>>();

function UserWorkspaceGuard({
  resource,
  action,
  children,
}: {
  resource: CrudResource;
  action: "read" | "create";
  children: React.ReactNode;
}) {
  const { roles, permissions, isHydrated, isLoggedIn } = useAuth();
  const router = useRouter();
  const allowed = can(roles, resource, action, permissions);
  useEffect(() => {
    if (isHydrated && !isLoggedIn) router.replace("/login");
  }, [isHydrated, isLoggedIn, router]);
  if (!isHydrated || !isLoggedIn) return null;
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

export function UserManagementWorkspace({
  resource,
  createOnly = false,
  hideCreateAction = false,
  createButtonFullWidth = true,
  createButtonLabel,
  createOnlyHeading,
  hideDomainHeading = false,
  createDialogTitle,
  createInitialValues,
  combinedUser = false,
  refreshKey,
  onCreated,
  onCreateHandlerReady,
  mobilePrimaryAction,
}: UserManagementWorkspaceProps) {
  const domain = getDomain(resource);
  const config = getCrudConfig(resource);
  const userConfig = combinedUser ? getCrudConfig("users") : null;
  const createFields =
    combinedUser && userConfig
      ? [
          ...config.fields
            .filter((field) => field.name !== "createUser" && field.name !== "username")
            .map((field) =>
              field.name === "musician.playedInstrumentId" ? { ...field, required: false, validate: undefined } : field,
            ),
          ...userConfig.fields.filter((field) => field.name !== "personId"),
        ]
      : config.fields;
  const guardianFields = [
    ...getCrudConfig("people")
      .fields.filter((field) => ["firstName", "lastName", "birthDate", "phone", "email"].includes(field.name))
      .map((field) => ({
        ...field,
        name: `guardian.${field.name}`,
        section: "Novo responsável",
        showWhen: undefined,
      })),
    ...getCrudConfig("users")
      .fields.filter((field) => field.name === "username")
      .map((field) => ({
        ...field,
        name: "guardian.username",
        section: "Novo responsável",
        showWhen: undefined,
      })),
  ];
  const { roles, permissions, user } = useAuth();
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [completionStatuses, setCompletionStatuses] = useState<Map<string, AdministrativeCompletionStatus>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [incompleteUserNotice, setIncompleteUserNotice] = useState<Record<string, unknown> | null>(null);
  const incompleteUserEditTarget = useRef<Record<string, unknown> | null>(null);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(config.defaults);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Record<string, unknown>[] | null>(null);
  const [issuedPasswords, setIssuedPasswords] = useState<IssuedPassword[]>([]);
  const [roleChoices, setRoleChoices] = useState<CrudOption[] | null>(null);
  const [choices, setChoices] = useState<UserManagementFormDynamicChoices>({
    people: null,
    instruments: null,
  });
  const [activeStage, setActiveStage] = useState(0);
  const [validatedStageTitles, setValidatedStageTitles] = useState<string[]>([]);
  const isAccountView = resource === "users" && dialogMode === "view" && selected?.personId != null;
  const isAccountEdit = resource === "users" && dialogMode === "edit" && selected?.personId != null;
  const isAccountWorkflow = isAccountView || isAccountEdit;
  const accountWorkflowFields = isAccountWorkflow
    ? [
        ...getCrudConfig("people").fields.filter((field) => field.name !== "createUser" && field.name !== "username"),
        ...config.fields.filter((field) => field.name !== "personId" && (isAccountEdit || field.name !== "password")),
        ...(isAccountEdit
          ? [
              {
                name: "confirmPassword",
                label: "Confirmar nova senha",
                type: "password" as const,
                section: "Acesso",
              },
            ]
          : []),
      ]
    : [];
  const combinedFields = combinedUser ? createFields : isAccountWorkflow ? accountWorkflowFields : createFields;
  const [guardianError, setGuardianError] = useState<string | null>(null);
  const personalContactHandlers = useRef<PersonalContactFormHandlers | null>(null);
  const guardianStageHandlers = useRef<GuardianStageHandlers | null>(null);
  const profilesStageHandlers = useRef<ProfilesStageHandlers | null>(null);
  const accessStageHandlers = useRef<AccessStageHandlers | null>(null);
  const permissionsStageHandlers = useRef<PermissionsStageHandlers | null>(null);
  const registerPersonalContactHandlers = useCallback((handlers: PersonalContactFormHandlers | null) => {
    personalContactHandlers.current = handlers;
  }, []);
  const registerGuardianStageHandlers = useCallback((handlers: GuardianStageHandlers | null) => {
    guardianStageHandlers.current = handlers;
  }, []);
  const registerProfilesStageHandlers = useCallback((handlers: ProfilesStageHandlers | null) => {
    profilesStageHandlers.current = handlers;
  }, []);
  const registerAccessStageHandlers = useCallback((handlers: AccessStageHandlers | null) => {
    accessStageHandlers.current = handlers;
  }, []);
  const registerPermissionsStageHandlers = useCallback((handlers: PermissionsStageHandlers | null) => {
    permissionsStageHandlers.current = handlers;
  }, []);
  const canCreate = can(roles, resource, "create", permissions);
  const canCreateAccount = !combinedUser || can(roles, "users", "create", permissions);
  const canUpdate = can(roles, resource, "update", permissions);
  const canDelete = can(roles, resource, "delete", permissions);
  const managesRoles = hasRole(roles, "admin");

  const sources = new Set<CrudOptionSource>();
  for (const field of config.fields) {
    if (field.optionsSource) sources.add(field.optionsSource);
  }
  const needsPeople = sources.has("people") || sources.has("people-without-user");
  const needsInstruments = sources.has("instruments") || isAccountWorkflow;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (resource === "users") {
        const [usersResult, peopleResult] = await Promise.allSettled([
          apiFetch<Record<string, unknown>[]>("/users"),
          apiFetch<unknown>("/people"),
        ]);
        if (usersResult.status === "rejected") throw usersResult.reason;
        const peopleById = new Map<string, Record<string, unknown>>();
        if (peopleResult.status === "fulfilled" && Array.isArray(peopleResult.value)) {
          peopleResult.value.forEach((person) => {
            if (typeof person === "object" && person !== null && "id" in person) {
              peopleById.set(String(person.id), person);
            }
          });
        }
        setItems(
          usersResult.value.map((account) => {
            const person = peopleById.get(String(account.personId));
            const personName = person
              ? `${String(person.firstName ?? "")} ${String(person.lastName ?? "")}`.trim()
              : "";
            return { ...account, personName };
          }),
        );
        setCompletionStatuses(
          peopleResult.status === "fulfilled"
            ? getAdministrativeCompletionStatuses(usersResult.value, peopleResult.value)
            : new Map(usersResult.value.map((user) => [String(user.id), "unverified"])),
        );
      } else {
        setItems(await apiFetch<Record<string, unknown>[]>(`/${domain.apiResource}`));
        setCompletionStatuses(new Map());
      }
    } catch (caught) {
      setError(failureMessage(caught, "Não foi possível carregar os registros. Confirme se a API está rodando."));
    } finally {
      setLoading(false);
    }
  }, [domain.apiResource, resource, setCompletionStatuses, setError, setItems, setLoading]);

  useEffect(() => {
    // A listagem precisa iniciar quando o workspace monta.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchItems();
  }, [fetchItems, refreshKey]);

  useEffect(() => {
    if ((resource !== "users" && !combinedUser) || !managesRoles) return;
    let active = true;
    apiFetch<Array<{ code: string; name: string }>>("/roles")
      .then((data) => {
        if (active) setRoleChoices(data.map((role) => ({ value: role.code, label: role.name })));
      })
      .catch(() => {
        if (active) setRoleChoices(null);
      });
    return () => {
      active = false;
    };
  }, [combinedUser, managesRoles, resource]);

  // Pessoas: usadas como responsável, dono de instrumento e pessoa do usuário.
  useEffect(() => {
    if (!needsPeople) return;
    let active = true;
    Promise.allSettled([
      apiFetch<Array<Pick<Person, "id" | "firstName" | "lastName" | "userId">>>("/people"),
      apiFetch<Array<{ personId?: string | number | null }>>("/users"),
    ])
      .then(([peopleResult, usersResult]) => {
        if (!active) return;
        if (peopleResult.status === "rejected") throw peopleResult.reason;
        const data = peopleResult.value;
        const users = usersResult.status === "fulfilled" ? usersResult.value : [];
        const peopleWithAccounts = new Set(users.map((user) => String(user.personId ?? "")).filter(Boolean));
        setChoices((current) => ({
          ...current,
          people: data.map((person) => ({
            value: String(person.id),
            label: `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || String(person.id),
            hasUser: (person.userId != null && person.userId !== "") || peopleWithAccounts.has(String(person.id)),
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
              label: [item.name, item.tuning].filter(Boolean).join(" · ") || String(item.id),
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
        label: `${String(saved.firstName ?? "")} ${String(saved.lastName ?? "")}`.trim() || id,
        hasUser: saved.userId != null && saved.userId !== "",
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

  let rows = config.filter ? items.filter(config.filter) : items;
  if (resource === "people") {
    rows = filterPeopleForRole(rows as unknown as Person[], roles, permissions) as unknown as Record<string, unknown>[];
  }

  const tableColumns = createDomainTableColumns(
    config.columns,
    (row, column) => formatCell(row, column, roleChoices, choices.people),
    resource,
  );
  const userCompletionColumn = useMemo<TableColumnDef<Record<string, unknown>> | null>(() => {
    if (resource !== "users") return null;
    return userTableColumnHelper.display({
      id: "administrativeCompletion",
      header: "Complemento",
      enableSorting: false,
      enableGrouping: false,
      cell: ({ row }) => {
        const status = completionStatuses.get(String(row.original.id)) ?? "unverified";
        const badge = {
          incomplete: {
            label: "Cadastro incompleto",
            className: "border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[var(--warning)]",
          },
          complete: {
            label: "Completo",
            className: "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]",
          },
          unverified: {
            label: "Não foi possível verificar",
            className: "border-[var(--border)] bg-[var(--accent)] text-[var(--muted)]",
          },
        }[status];
        return (
          <span
            className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        );
      },
    });
  }, [completionStatuses, resource]);
  const visibleTableColumns = userCompletionColumn ? [...tableColumns, userCompletionColumn] : tableColumns;

  const openCreate = useCallback(() => {
    const createConfig = getCrudConfig(resource);
    const createUserConfig = combinedUser ? getCrudConfig("users") : null;
    setSelected(null);
    setValues({
      ...createConfig.defaults,
      ...(createUserConfig?.defaults ?? {}),
      ...createInitialValues,
      ...(combinedUser ? { status: "", photoSource: "" } : {}),
    });
    setFormErrors({});
    setGuardianError(null);
    setActiveStage(0);
    setValidatedStageTitles([]);
    setDialogMode("create");
  }, [
    combinedUser,
    createInitialValues,
    resource,
    setActiveStage,
    setDialogMode,
    setFormErrors,
    setGuardianError,
    setSelected,
    setValidatedStageTitles,
    setValues,
  ]);

  useEffect(() => {
    if (!createOnly || !canCreate || !canCreateAccount) {
      onCreateHandlerReady?.(null);
      return;
    }

    onCreateHandlerReady?.(openCreate);
    return () => onCreateHandlerReady?.(null);
  }, [canCreate, canCreateAccount, createOnly, onCreateHandlerReady, openCreate]);

  const openItem = async (item: Record<string, unknown>, mode: "view" | "edit") => {
    const itemValues = {
      ...config.defaults,
      ...(config.toForm ? config.toForm(item) : item),
    };
    if (resource === "users" && (mode === "view" || mode === "edit") && item.personId != null) {
      try {
        const person = await apiFetch<Record<string, unknown>>(`/people/${encodeURIComponent(String(item.personId))}`);
        const peopleConfig = getCrudConfig("people");
        Object.assign(
          itemValues,
          peopleConfig.defaults,
          peopleConfig.toForm ? peopleConfig.toForm(person) : person,
          config.toForm ? config.toForm(item) : item,
        );
        const photoUrl = String(itemValues.photoUrl ?? "");
        itemValues.photoSource = !photoUrl ? "" : /^\/uploads\/[^/]+$/.test(photoUrl) ? "upload" : "external";
      } catch (caught) {
        setError(userFacingError(caught));
      }
    }
    setSelected(item);
    setValues(itemValues);
    setFormErrors({});
    setActiveStage(0);
    setValidatedStageTitles([]);
    setDialogMode(mode);
  };

  const handleIncompleteUserNoticeClosed = () => {
    const target = incompleteUserEditTarget.current;
    incompleteUserEditTarget.current = null;
    if (target) void openItem(target, "edit");
  };

  const renderMobileUserIncompleteIndicator = (row: Record<string, unknown>) => {
    if (resource !== "users") return null;
    const status = completionStatuses.get(String(row.id));
    if (status !== "incomplete") return null;
    return (
      <TableMobileIconAction
        ariaLabel={`Abrir aviso de cadastro incompleto para ${String(row.username ?? row.id)}`}
        icon="warning"
        onClick={() => setIncompleteUserNotice(row)}
        className="text-[var(--warning)]"
      />
    );
  };

  const getRowActions = (row: Record<string, unknown>, includeView: boolean, mobile = false) => {
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
      view: includeView ? { onSelect: () => void openItem(row, "view") } : undefined,
      edit: canUpdate ? { onSelect: () => void openItem(row, "edit") } : undefined,
      remove: canDelete
        ? {
            onSelect: () => setDeleteTarget(row),
            disabled: resource === "users" && String(row.id) === String(user?.id),
            disabledTitle: "Não é possível excluir o usuário da sessão.",
          }
        : undefined,
    });
  };

  const renderRowActions = (row: Record<string, unknown>) => <TableRowActions actions={getRowActions(row, false)} />;

  const closeDialog = () => {
    if (saving) return;
    setDialogMode(null);
    setSelected(null);
    setFormErrors({});
  };

  const handleSave = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const fieldsToValidate =
      combinedUser && dialogMode === "create"
        ? combinedFields.filter((field) => !stageFieldNames.personal?.includes(field.name))
        : combinedFields;
    const errors = validateValues(fieldsToValidate, values);

    if ((resource === "users" || combinedUser) && !managesRoles) {
      const previous = Array.isArray(selected?.roles) ? selected.roles.map(String).sort() : [];
      const next = Array.isArray(values.roles) ? values.roles.map(String).sort() : [];
      if (previous.join("|") !== next.join("|")) {
        errors.roles = "Somente um administrador pode vincular ou desvincular papéis.";
      }
    }

    const uniqueFields = new Set([...uniqueFieldsForResource(resource), ...(combinedUser ? ["username"] : [])]);
    for (const uniqueField of uniqueFields) {
      const candidate = normalizeUniqueValue(values[uniqueField]);
      if (
        candidate &&
        items.some(
          (item) => item.id !== selected?.id && normalizeUniqueValue(getValue(item, uniqueField)) === candidate,
        )
      ) {
        errors[uniqueField] = "Já existe um registro com este valor.";
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (isAccountEdit) {
      const accessResult = accessSchema.safeParse(accessDetailsFrom(values));
      const accessErrors: Record<string, string> = accessResult.success
        ? {}
        : Object.fromEntries(
            accessResult.error.issues.map((issue) => [String(issue.path[0] ?? "access"), issue.message]),
          );
      if (!String(values.username ?? "").trim()) {
        accessErrors.username = "Informe o nome de usuário.";
      }
      if (Object.keys(accessErrors).length > 0) {
        setFormErrors((current) => ({ ...current, ...accessErrors }));
        setActiveStage(wizardStages.findIndex((stage) => stage.id === "access"));
        return;
      }
    }

    setSaving(true);
    setError(null);
    let createdPerson: Record<string, unknown> | null = null;
    let createdGuardianPerson: Record<string, unknown> | null = null;
    let updatedPerson: Record<string, unknown> | null = null;
    try {
      if (isAccountEdit && selected) {
        const peopleConfig = getCrudConfig("people");
        const personValues = { ...values };
        for (const field of [
          "confirmPassword",
          "isActive",
          "password",
          "photoSource",
          "personId",
          "roles",
          "username",
        ]) {
          delete personValues[field];
        }
        const mappedPerson = peopleConfig.toPayload ? peopleConfig.toPayload(personValues) : personValues;
        const personPayload = {
          ...withAudit(mappedPerson, {
            createdAt: values.createdAt,
          }),
          userId: selected.id,
        };
        updatedPerson = await apiFetch<Record<string, unknown>>(
          `/people/${encodeURIComponent(String(selected.personId))}`,
          {
            method: "PUT",
            body: JSON.stringify(personPayload),
          },
        );

        const mappedAccount = config.toPayload ? config.toPayload(values, selected) : values;
        const accountPayload: Record<string, unknown> = {
          ...selected,
          ...mappedAccount,
          personId: selected.personId,
        };
        delete accountPayload.confirmPassword;
        if (typeof accountPayload.password === "string") {
          if (!usesRemoteApi() || !accountPayload.password) {
            delete accountPayload.password;
          } else {
            accountPayload.password = await sealPassword(accountPayload.password);
          }
        }
        const updatedAccount = await apiFetch<Record<string, unknown>>(
          `/${domain.apiResource}/${String(selected.id)}`,
          {
            method: "PUT",
            body: JSON.stringify(accountPayload),
          },
        );
        const stored = {
          ...selected,
          ...updatedAccount,
          name: `${String(updatedPerson.firstName ?? "")} ${String(updatedPerson.lastName ?? "")}`.trim(),
          email: updatedPerson.email,
        };
        setItems((current) => current.map((item) => (String(item.id) === String(selected.id) ? stored : item)));
        setCompletionStatuses((current) =>
          new Map(current).set(String(selected.id), evaluateAdministrativeCompletion(updatedPerson)),
        );
        refreshPeopleChoices(updatedPerson);
        setDialogMode(null);
        setSelected(null);
        setFormErrors({});
        return;
      }

      if (combinedUser && userConfig?.toPayload && dialogMode === "create") {
        let personValues = values;
        if (isCreatingGuardian) {
          const guardianValues = {
            ...config.defaults,
            firstName: values["guardian.firstName"],
            lastName: values["guardian.lastName"],
            birthDate: values["guardian.birthDate"],
            phone: values["guardian.phone"],
            email: values["guardian.email"],
            guardianId: "",
            createUser: false,
          };
          const guardianPayload = config.toPayload ? config.toPayload(guardianValues) : guardianValues;
          createdGuardianPerson = await apiFetch<Record<string, unknown>>("/people", {
            method: "POST",
            body: JSON.stringify(guardianPayload),
          });
          const guardianAccountPayload = userConfig.toPayload({
            personId: createdGuardianPerson.id,
            username: values["guardian.username"],
            roles: ["amigos"],
            isActive: true,
          });
          guardianAccountPayload.personId = createdGuardianPerson.id;
          const guardianAccount = await apiFetch<Record<string, unknown>>("/users", {
            method: "POST",
            body: JSON.stringify(guardianAccountPayload),
          });
          const guardianTemporaryPassword =
            typeof guardianAccount.temporaryPassword === "string" ? guardianAccount.temporaryPassword : "";
          if (guardianTemporaryPassword) {
            setIssuedPasswords((current) => [
              ...current,
              {
                name: config.itemLabel(createdGuardianPerson ?? {}),
                username: String(guardianAccount.username ?? ""),
                password: guardianTemporaryPassword,
              },
            ]);
          }
          const guardian = {
            ...createdGuardianPerson,
            userId: guardianAccount.id,
            user: guardianAccount,
          };
          refreshPeopleChoices(guardian);
          setItems((current) => [...current, guardian]);
          personValues = {
            ...values,
            guardianId: createdGuardianPerson.id,
          };
          setValues((current) => ({
            ...current,
            guardianId: String(createdGuardianPerson?.id ?? ""),
          }));
          setGuardianError(null);
        }

        const childValues = { ...personValues };
        for (const field of guardianFields) delete childValues[field.name];
        delete childValues.confirmPassword;
        delete childValues.photoSource;
        for (const field of [
          "postalCode",
          "street",
          "addressNumber",
          "complement",
          "unit",
          "neighborhood",
          "city",
          "state",
        ])
          delete childValues[field];
        if (childValues["document.type"] === "none") {
          childValues["document.type"] = "";
          childValues["document.number"] = "";
        }
        const mappedPersonPayload = config.toPayload ? config.toPayload(childValues) : childValues;
        const personPayload = { ...mappedPersonPayload };
        if (personValues.guardianId !== "" && personValues.guardianId != null) {
          personPayload.guardianId = personValues.guardianId;
        }
        delete personPayload.personId;
        delete personPayload.createUser;
        delete personPayload.username;
        delete personPayload.roles;
        delete personPayload.isActive;
        delete personPayload.password;
        createdPerson = await apiFetch<Record<string, unknown>>("/people", {
          method: "POST",
          body: JSON.stringify(personPayload),
        });

        const accountPayload = userConfig.toPayload({
          ...values,
          personId: createdPerson.id,
        });
        delete accountPayload.confirmPassword;
        accountPayload.personId = createdPerson.id;
        if (typeof accountPayload.password === "string") {
          if (!usesRemoteApi() || !accountPayload.password) {
            delete accountPayload.password;
          } else {
            accountPayload.password = await sealPassword(accountPayload.password);
          }
        }
        const account = await apiFetch<Record<string, unknown>>("/users", {
          method: "POST",
          body: JSON.stringify(accountPayload),
        });
        const stored = {
          ...createdPerson,
          userId: account.id,
          user: account,
        };
        setItems((current) => [...current, stored]);
        refreshPeopleChoices(stored);
        onCreated?.();
        const temporaryPassword = typeof account.temporaryPassword === "string" ? account.temporaryPassword : "";
        if (temporaryPassword) {
          setIssuedPasswords((current) => [
            ...current,
            {
              name: config.itemLabel(stored),
              username: String(account.username ?? ""),
              password: temporaryPassword,
            },
          ]);
        }
        setDialogMode(null);
        setSelected(null);
        setFormErrors({});
        return;
      }

      const mapped = config.toPayload
        ? config.toPayload(values, selected ?? undefined)
        : withAudit(values, selected ?? undefined);
      const payload: Record<string, unknown> = dialogMode === "create" ? mapped : { ...selected, ...mapped };
      // Senha de usuário nunca sai em claro: cifrada para a API; no mock, nem é enviada.
      if (typeof payload.password === "string") {
        if (!usesRemoteApi() || !payload.password) {
          delete payload.password;
        } else {
          payload.password = await sealPassword(payload.password);
        }
      }
      const endpoint =
        dialogMode === "create" ? `/${domain.apiResource}` : `/${domain.apiResource}/${String(selected?.id)}`;
      const saved = await apiFetch<Record<string, unknown>>(endpoint, {
        method: dialogMode === "create" ? "POST" : "PUT",
        body: JSON.stringify(payload),
      });
      const temporaryPassword = typeof saved.temporaryPassword === "string" ? saved.temporaryPassword : "";
      const stored = { ...saved };
      delete stored.temporaryPassword;
      setItems((current) =>
        dialogMode === "create" ? [...current, stored] : current.map((item) => (item.id === stored.id ? stored : item)),
      );
      if (resource === "users" && dialogMode === "create") void fetchItems();
      if (resource === "people") refreshPeopleChoices(stored);
      if (resource === "users" && dialogMode === "create") {
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
        setIssuedPasswords((current) => [
          ...current,
          {
            name: config.itemLabel(stored),
            username: String(stored.username ?? account?.username ?? ""),
            password: temporaryPassword,
          },
        ]);
      }
      setDialogMode(null);
      setSelected(null);
      setFormErrors({});
      if (dialogMode === "create") onCreated?.();
    } catch (caught) {
      if (updatedPerson && selected) {
        setCompletionStatuses((current) =>
          new Map(current).set(String(selected.id), evaluateAdministrativeCompletion(updatedPerson)),
        );
        const name = `${String(updatedPerson.firstName ?? "")} ${String(updatedPerson.lastName ?? "")}`.trim();
        setItems((current) =>
          current.map((item) =>
            String(item.id) === String(selected.id) ? { ...item, name, email: updatedPerson?.email } : item,
          ),
        );
        refreshPeopleChoices(updatedPerson);
        setError(
          `Os dados pessoais foram salvos, mas não foi possível concluir a atualização da conta. ${userFacingError(caught)}`,
        );
      } else if (createdGuardianPerson && !createdPerson) {
        setGuardianError(
          `O responsável foi cadastrado, mas não foi possível concluir a conta ou o integrante: ${userFacingError(caught)}`,
        );
      }
      if (createdPerson) {
        setItems((current) => [...current, createdPerson as Record<string, unknown>]);
        refreshPeopleChoices(createdPerson);
        setDialogMode(null);
        setSelected(null);
        setFormErrors({});
        setError(
          `A pessoa foi cadastrada, mas a conta não foi criada. ${userFacingError(caught)} A pessoa já está disponível no fluxo de novo usuário.`,
        );
      } else {
        setError(userFacingError(caught));
      }
    } finally {
      setSaving(false);
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
      const deletedIds = targets.filter((_, index) => results[index].status === "fulfilled").map((target) => target.id);
      const failedTargets = targets.filter((_, index) => results[index].status === "rejected");
      if (deletedIds.length > 0) {
        setItems((current) => current.filter((item) => !deletedIds.includes(item.id)));
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

  const minor = Boolean(values.birthDate) && isPersonUnderage(String(values.birthDate));
  const isCreatingGuardian = combinedUser && minor && values.guardianId === NEW_GUARDIAN_VALUE;
  const wizardStages =
    combinedUser || isAccountWorkflow
      ? [
          {
            id: "personal",
            title: "Dados pessoais e contato",
            shortTitle: "Dados",
            icon: "person",
          },
          ...(minor
            ? [
                {
                  id: "guardian",
                  title: "Responsável",
                  shortTitle: "Responsável",
                  icon: "supervisor_account",
                },
              ]
            : []),
          {
            id: "profiles",
            title: "Perfis da pessoa",
            shortTitle: "Perfis",
            icon: "groups",
          },
          { id: "access", title: "Acesso", shortTitle: "Acesso", icon: "key" },
          {
            id: "permissions",
            title: "Permissões",
            shortTitle: "Permissões",
            icon: "admin_panel_settings",
          },
        ]
      : [];
  const stageFieldNames: Record<string, string[]> = {
    personal: combinedFields
      .filter(
        (field) =>
          ["Dados pessoais", "Contato"].includes(field.section ?? "") ||
          ["status", "registeredAt", "photoUrl"].includes(field.name),
      )
      .map((field) => field.name),
    guardian: ["guardianId", "guardianRelationship"],
    profiles: combinedFields
      .filter((field) => ["Perfis", "Aluno", "Músico"].includes(field.section ?? "") && field.name !== "roles")
      .map((field) => field.name),
    access: ["username", "password", "confirmPassword", "isActive"],
    permissions: ["roles"],
  };
  const activeWizardStage = wizardStages[activeStage];
  const stageFields =
    (combinedUser || isAccountWorkflow) && activeWizardStage
      ? combinedFields.filter((field) =>
          stageFieldNames[(activeWizardStage as { id: string }).id]?.includes(field.name),
        )
      : combinedFields;

  const stageStatuses = Object.fromEntries(
    wizardStages.flatMap((stage) => {
      if (!validatedStageTitles.includes(stage.title)) return [];
      if (stage.id === "personal") {
        const parsed = personDetailsSchema.safeParse(personDetailsFrom(values));
        const issues = parsed.success ? [] : parsed.error.issues;
        const missingNames = new Set(
          [
            "firstName",
            "lastName",
            "birthDate",
            "phone",
            "photoSource",
            ...(values["document.type"] === "cpf" || values["document.type"] === "rg" ? ["documentNumber"] : []),
          ].filter((name) => {
            const fieldName = name === "documentNumber" ? "document.number" : name;
            return String(values[fieldName] ?? "").trim() === "";
          }),
        );
        const hasInvalidValue = issues.some((issue) => !missingNames.has(String(issue.path[0] ?? "")));
        const status: FormStageStatus = hasInvalidValue ? "error" : issues.length > 0 ? "warning" : "complete";
        return [[stage.title, status] as const];
      }
      if (stage.id === "guardian") {
        const parsed = guardianSchema.safeParse(guardianDetailsFrom(values));
        if (parsed.success) return [[stage.title, "complete"] as const];
        const hasInvalidValue = parsed.error.issues.some((issue) => {
          const path = issue.path.join(".");
          return String(values[path] ?? "").trim() !== "";
        });
        const status: FormStageStatus = hasInvalidValue ? "error" : "warning";
        return [[stage.title, status] as const];
      }
      if (stage.id === "profiles") {
        const parsed = personProfilesSchema.safeParse(personProfilesFrom(values));
        if (parsed.success) return [[stage.title, "complete"] as const];
        const missingPaths = new Set(["student.enrollmentDate", "musician.section"]);
        const hasInvalidValue = parsed.error.issues.some((issue) => {
          const path = issue.path.join(".");
          return !missingPaths.has(path) || String(values[path] ?? "").trim() !== "";
        });
        return [[stage.title, hasInvalidValue ? "error" : "warning"] as const];
      }
      if (stage.id === "access") {
        const parsed = accessSchema.safeParse(accessDetailsFrom(values));
        const usernameMissing = isAccountEdit && !String(values.username ?? "").trim();
        return [[stage.title, parsed.success && !usernameMissing ? "complete" : "error"] as const];
      }
      if (stage.id === "permissions") {
        const parsed = permissionsSchema.safeParse({
          roles: Array.isArray(values.roles) ? values.roles.map(String) : [],
        });
        return [[stage.title, parsed.success ? "complete" : "error"] as const];
      }
      const fields = combinedFields.filter((field) => stageFieldNames[stage.id]?.includes(field.name));
      const errors = validateValues(fields, values);
      const hasInvalidValue = fields.some((field) => {
        if (!errors[field.name]) return false;
        const value = values[field.name];
        const empty =
          value === undefined ||
          value === null ||
          (Array.isArray(value) ? value.length === 0 : String(value).trim() === "");
        return !(field.required && empty);
      });
      const status: FormStageStatus = hasInvalidValue
        ? "error"
        : Object.keys(errors).length > 0
          ? "warning"
          : "complete";
      return [[stage.title, status] as const];
    }),
  );

  const validateCurrentStage = async (): Promise<boolean> => {
    let isValid = false;
    if (isAccountEdit && activeWizardStage?.id === "access") {
      const result = accessSchema.safeParse(accessDetailsFrom(values));
      const errors = result.success
        ? {}
        : Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0] ?? "access"), issue.message]));
      if (!String(values.username ?? "").trim()) {
        errors.username = "Informe o nome de usuário.";
      }
      setFormErrors((current) => {
        const next = { ...current };
        for (const field of ["username", "password", "confirmPassword"]) delete next[field];
        return { ...next, ...errors };
      });
      isValid = result.success && Boolean(String(values.username ?? "").trim());
    } else if (activeWizardStage?.id === "personal") {
      isValid = await (personalContactHandlers.current?.validate() ?? false);
    } else if (activeWizardStage?.id === "guardian") {
      isValid = await (guardianStageHandlers.current?.validate() ?? false);
    } else if (activeWizardStage?.id === "profiles") {
      isValid = await (profilesStageHandlers.current?.validate() ?? false);
    } else if (activeWizardStage?.id === "access") {
      isValid = await (accessStageHandlers.current?.validate() ?? false);
    } else if (activeWizardStage?.id === "permissions") {
      isValid = await (permissionsStageHandlers.current?.validate() ?? false);
    } else {
      const errors = validateValues(stageFields, values);
      setFormErrors((current) => ({ ...current, ...errors }));
      isValid = Object.keys(errors).length === 0;
    }
    if (activeWizardStage) {
      setValidatedStageTitles((current) =>
        current.includes(activeWizardStage.title) ? current : [...current, activeWizardStage.title],
      );
    }
    return isValid;
  };

  const activateWizardStage = (index: number) => {
    const stage = wizardStages[index];
    if (stage) {
      setValidatedStageTitles((current) => (current.includes(stage.title) ? current : [...current, stage.title]));
    }
    setActiveStage(index);
  };

  const goToNextStage = async () => {
    if (!(await validateCurrentStage())) return;
    const next = Math.min(activeStage + 1, wizardStages.length - 1);
    activateWizardStage(next);
  };

  const selectWizardStage = (index: number) => {
    if (index === activeStage) return;
    void validateCurrentStage();
    activateWizardStage(index);
  };

  const returnToPreviousStage = () => {
    void validateCurrentStage();
    activateWizardStage(Math.max(0, activeStage - 1));
  };
  const allWizardStagesComplete =
    wizardStages.length > 0 && wizardStages.every((stage) => stageStatuses[stage.title] === "complete");
  const issuedPassword = issuedPasswords[0] ?? null;

  return (
    <UserWorkspaceGuard resource={resource} action={createOnly ? "create" : "read"}>
      <section className={createOnly ? "min-w-0 flex-1" : "mx-auto space-y-6"}>
        {createOnly && error ? (
          <p
            className="mb-3 rounded-xl border border-[var(--destructive)]/40 px-4 py-3 text-sm text-[var(--destructive)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <header
          className={
            createOnly
              ? createOnlyHeading
                ? "flex w-full flex-wrap items-center justify-between gap-4"
                : "flex w-full"
              : "flex flex-wrap items-end justify-between gap-4"
          }
        >
          {createOnly ? (
            createOnlyHeading && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Domínio</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight">{createOnlyHeading}</h2>
              </div>
            )
          ) : !hideDomainHeading ? (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Domínio</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{domain.label}</h1>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">{domain.description}</p>
            </div>
          ) : null}
          {!hideCreateAction && canCreate && canCreateAccount && (
            <div className="hidden min-[960px]:block">
              <button
                type="button"
                className={`btn-primary min-h-11 ${createOnly && createButtonFullWidth ? "w-full" : ""} ${buttonMotion}`}
                onClick={openCreate}
              >
                {createButtonLabel ?? "Novo cadastro"}
              </button>
            </div>
          )}
        </header>

        {!createOnly && (
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
              <p className="text-sm text-[var(--muted)]">Seu perfil</p>
              <p className="text-lg font-semibold">{roleLabels(roles)}</p>
            </article>
            <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
              <p className="text-sm text-[var(--muted)]">Registros visíveis</p>
              <p className="text-lg font-semibold">{loading ? "…" : rows.length}</p>
            </article>
            <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
              <p className="text-sm text-[var(--muted)]">Escrita</p>
              <p className="text-lg font-semibold">{canCreate ? "Permitida" : "Somente leitura"}</p>
            </article>
          </div>
        )}

        {!createOnly && (
          <article className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="p-4">
              <TableView
                tableId={resource}
                data={rows}
                columns={visibleTableColumns}
                getRowId={(row, index) => String(row.id ?? index)}
                loading={loading}
                error={error}
                onRefresh={() => void fetchItems()}
                globalFilterLabel={`Buscar ${domain.label.toLocaleLowerCase("pt-BR")}`}
                emptyMessage={`Nenhum registro de ${domain.label.toLocaleLowerCase("pt-BR")} encontrado.`}
                noResultsMessage="Nenhum registro corresponde à busca ou aos filtros."
                getRowLabel={(row) => config.itemLabel(row)}
                mobilePrimaryLabel={resource === "people" ? "Informações de" : undefined}
                getMobilePrimary={
                  resource === "users"
                    ? (row) => String(row.personName ?? row.name ?? row.username ?? "Usuário")
                    : resource === "people"
                      ? (row) => `${String(row.firstName ?? "")} ${String(row.lastName ?? "")}`.trim()
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
                  mobilePrimaryAction ??
                  (!hideCreateAction && canCreate && canCreateAccount ? (
                    <button
                      type="button"
                      className={"btn-primary min-h-11 w-full " + buttonMotion}
                      onClick={openCreate}
                    >
                      {createButtonLabel ?? "Novo cadastro"}
                    </button>
                  ) : undefined)
                }
                mobileSelectionEnabled={canDelete}
                onDeleteSelected={(targets, clearSelection) => {
                  if (!canDelete || targets.length === 0) return;
                  const ownAccountId = String(user?.id ?? "");
                  const ownAccountSelected =
                    resource === "users" && targets.some((target) => String(target.id) === ownAccountId);
                  const deletableTargets =
                    resource === "users" ? targets.filter((target) => String(target.id) !== ownAccountId) : targets;
                  clearSelection();
                  if (deletableTargets.length === 0) {
                    setBulkDeleteTargets(null);
                    setDeleteTarget(null);
                    setError("Sua própria conta não pode ser excluída.");
                    return;
                  }
                  setError(ownAccountSelected ? "Sua própria conta será ignorada na exclusão em lote." : null);
                  setBulkDeleteTargets(deletableTargets);
                  setDeleteTarget(null);
                }}
                renderRowActions={renderRowActions}
                renderMobileCardHeaderExtra={resource === "users" ? renderMobileUserIncompleteIndicator : undefined}
                renderMobileRowActions={(row) => getRowActions(row, false, true)}
                toolbarLabels={{
                  section: `Controles de ${domain.label.toLocaleLowerCase("pt-BR")}`,
                }}
              />
            </div>
          </article>
        )}
      </section>

      <EntityDialog
        open={Boolean(incompleteUserNotice)}
        title="Cadastro incompleto"
        description={`O cadastro de ${config.itemLabel(incompleteUserNotice ?? {})} está incompleto${canUpdate ? " e precisa ser atualizado." : " e precisa ser atualizado por alguém com permissão para editar."}`}
        size="sm"
        placement="center"
        closeOnBackdropClick
        onClose={() => setIncompleteUserNotice(null)}
        onCloseComplete={handleIncompleteUserNoticeClosed}
      >
        <div className="p-4 sm:p-6">
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className={`btn-ghost min-h-11 ${buttonMotion}`}
              onClick={() => setIncompleteUserNotice(null)}
            >
              Agora não
            </button>
            {canUpdate ? (
              <button
                type="button"
                className={`btn-primary min-h-11 ${buttonMotion}`}
                onClick={() => {
                  if (!incompleteUserNotice) return;
                  incompleteUserEditTarget.current = incompleteUserNotice;
                  setIncompleteUserNotice(null);
                }}
              >
                Atualizar cadastro
              </button>
            ) : null}
          </div>
        </div>
      </EntityDialog>

      {dialogMode && (
        <EntityDialog
          open
          title={
            dialogMode === "create"
              ? (createDialogTitle ?? `Novo ${config.singular}`)
              : dialogMode === "edit"
                ? `Editar ${config.itemLabel(selected ?? {})}`
                : config.itemLabel(selected ?? {})
          }
          size="xl"
          placement="bottom"
          closeOnBackdropClick
          onClose={closeDialog}
        >
          {guardianError ? (
            <p
              className="mx-4 mt-4 rounded-xl border border-[var(--destructive)]/40 px-4 py-3 text-sm text-[var(--destructive)] sm:mx-6"
              role="alert"
            >
              {guardianError}
            </p>
          ) : null}
          {((combinedUser && dialogMode === "create") || isAccountWorkflow) && wizardStages.length > 0 ? (
            <div className="border-b border-[var(--border)] px-4 pt-4 sm:px-6">
              <IconSelect
                label="Etapas do formulário"
                options={wizardStages.map((stage) => ({
                  value: stage.id,
                  label: stage.shortTitle,
                  icon: stage.icon,
                }))}
                value={wizardStages[activeStage]?.id ?? wizardStages[0].id}
                onChange={(stageId) => {
                  const index = wizardStages.findIndex((stage) => stage.id === stageId);
                  if (index < 0) return;
                  if (isAccountView) setActiveStage(index);
                  else selectWizardStage(index);
                }}
                className="relative mb-3 min-w-0 w-full md:hidden"
              />
              <div className="hidden md:block">
                <FormStageProgress
                  stages={wizardStages}
                  active={activeStage}
                  maxReachable={wizardStages.length - 1}
                  statuses={isAccountView ? undefined : stageStatuses}
                  onSelect={isAccountView ? setActiveStage : selectWizardStage}
                  ariaLabel={
                    isAccountView
                      ? "Etapas dos dados do integrante"
                      : isAccountEdit
                        ? "Etapas da edição do integrante"
                        : "Etapas do novo integrante"
                  }
                />
              </div>
            </div>
          ) : null}
          <UserManagementForm
            fields={stageFields.filter(
              (field) =>
                (field.name !== "createUser" && field.name !== "username") ||
                resource === "users" ||
                combinedUser ||
                can(roles, "users", "create", permissions),
            )}
            values={values}
            errors={formErrors}
            readOnly={dialogMode === "view"}
            editing={dialogMode === "edit"}
            saving={saving}
            roleChoices={roleChoices}
            dynamicChoices={choices}
            guardianUsersOnly={combinedUser}
            personalContactStage={
              ((combinedUser && dialogMode === "create") || isAccountWorkflow) && activeWizardStage?.id === "personal"
            }
            guardianStage={
              ((combinedUser && dialogMode === "create") || isAccountWorkflow) && activeWizardStage?.id === "guardian"
            }
            profilesStage={
              ((combinedUser && dialogMode === "create") || isAccountWorkflow) && activeWizardStage?.id === "profiles"
            }
            accessStage={
              ((combinedUser && dialogMode === "create") || isAccountWorkflow) && activeWizardStage?.id === "access"
            }
            permissionsStage={
              ((combinedUser && dialogMode === "create") || isAccountWorkflow) &&
              activeWizardStage?.id === "permissions"
            }
            guardianPeople={choices.people ?? []}
            guardianRelationshipOptions={
              getCrudConfig("people").fields.find((field) => field.name === "guardianRelationship")?.options ?? []
            }
            onRegisterPersonalContactHandlers={
              (combinedUser && dialogMode === "create") || isAccountWorkflow
                ? registerPersonalContactHandlers
                : undefined
            }
            onRegisterGuardianStageHandlers={
              (combinedUser && dialogMode === "create") || isAccountWorkflow ? registerGuardianStageHandlers : undefined
            }
            onRegisterProfilesStageHandlers={
              (combinedUser && dialogMode === "create") || isAccountWorkflow ? registerProfilesStageHandlers : undefined
            }
            onRegisterAccessStageHandlers={
              (combinedUser && dialogMode === "create") || isAccountWorkflow ? registerAccessStageHandlers : undefined
            }
            onRegisterPermissionsStageHandlers={
              (combinedUser && dialogMode === "create") || isAccountWorkflow
                ? registerPermissionsStageHandlers
                : undefined
            }
            preventImplicitSubmit={
              ((combinedUser && dialogMode === "create") || isAccountEdit) &&
              (activeWizardStage?.id === "permissions" || activeWizardStage?.id === "personal")
            }
            rolesLocked={(resource === "users" || combinedUser) && !managesRoles}
            onChange={(name, value) => {
              setValues((current) => ({
                ...current,
                [name]: value,
                ...(name === "birthDate" &&
                (!value || !isPersonUnderage(String(value))) &&
                current.guardianId === NEW_GUARDIAN_VALUE
                  ? { guardianId: "" }
                  : {}),
              }));
              setFormErrors((current) => ({ ...current, [name]: "" }));
              if (name === "guardianId") setGuardianError(null);
              if ((combinedUser || isAccountEdit) && name === "birthDate") {
                setActiveStage(0);
                setValidatedStageTitles([]);
              }
            }}
            onClose={closeDialog}
            onSubmit={
              isAccountView
                ? (event) => event.preventDefault()
                : isAccountEdit
                  ? (event) => {
                      event.preventDefault();
                      if (activeStage < wizardStages.length - 1) {
                        void goToNextStage();
                      } else {
                        void handleSave();
                      }
                    }
                  : combinedUser && dialogMode === "create"
                    ? (event) => {
                        event.preventDefault();
                        if (activeStage < wizardStages.length - 1) {
                          goToNextStage();
                        }
                      }
                    : handleSave
            }
            footerActions={
              combinedUser && dialogMode === "create" ? (
                <FormStageActions
                  active={activeStage}
                  total={wizardStages.length}
                  busy={saving}
                  submitDisabled={!allWizardStagesComplete}
                  onBack={returnToPreviousStage}
                  onNext={goToNextStage}
                  onSubmit={() =>
                    personalContactHandlers.current?.submit(
                      () => handleSave(),
                      () => {
                        setValidatedStageTitles((current) =>
                          current.includes("Dados pessoais e contato")
                            ? current
                            : [...current, "Dados pessoais e contato"],
                        );
                        setActiveStage(0);
                      },
                    )
                  }
                  submitLabel="Criar integrante"
                  pendingLabel="Criando…"
                />
              ) : isAccountEdit ? (
                <FormStageActions
                  active={activeStage}
                  total={wizardStages.length}
                  busy={saving}
                  submitDisabled={!allWizardStagesComplete}
                  onBack={returnToPreviousStage}
                  onNext={goToNextStage}
                  onSubmit={() => void handleSave()}
                  submitLabel="Salvar alterações"
                  pendingLabel="Salvando…"
                />
              ) : undefined
            }
            onEdit={dialogMode === "view" && canUpdate && selected ? () => openItem(selected, "edit") : undefined}
          />
        </EntityDialog>
      )}

      {(deleteTarget || bulkDeleteTargets) && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <h2 id="delete-title" className="text-xl font-semibold">
              {bulkDeleteTargets ? `Excluir ${bulkDeleteTargets.length} registro(s)` : `Excluir ${config.singular}`}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {bulkDeleteTargets ? (
                <>Confirma a exclusão dos registros selecionados? Esta ação não pode ser desfeita.</>
              ) : (
                <>
                  Confirma a exclusão de <strong>{config.itemLabel(deleteTarget ?? {})}</strong>? Esta ação não pode ser
                  desfeita.
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className={`btn-ghost min-h-11 ${buttonMotion}`}
                disabled={saving}
                onClick={() => {
                  setDeleteTarget(null);
                  setBulkDeleteTargets(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`btn-danger min-h-11 ${buttonMotion}`}
                disabled={saving}
                onClick={() => void handleDelete()}
              >
                {saving ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {issuedPassword && (
        <div
          className="fixed inset-0 z-[210] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="issued-password-title"
        >
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
            <h2 id="issued-password-title" className="text-xl font-semibold">
              Acesso criado
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Envie o usuário e a senha inicial para <strong>{issuedPassword.name}</strong>. A senha não será mostrada
              de novo e precisa ser trocada no primeiro acesso.
            </p>
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
                    .writeText(`Usuário: ${issuedPassword.username}\nSenha: ${issuedPassword.password}`)
                    .catch(() => undefined);
                }}
              >
                Copiar
              </button>
              <button
                type="button"
                className={`btn-primary min-h-11 ${buttonMotion}`}
                onClick={() => setIssuedPasswords((current) => current.slice(1))}
              >
                Já anotei
              </button>
            </div>
          </div>
        </div>
      )}
    </UserWorkspaceGuard>
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

function validateValues(fields: CrudField[], values: Record<string, unknown>): Record<string, string> {
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

function personDetailsFrom(values: Record<string, unknown>) {
  return {
    firstName: String(values.firstName ?? ""),
    lastName: String(values.lastName ?? ""),
    birthDate: String(values.birthDate ?? ""),
    registeredAt: String(values.registeredAt ?? ""),
    documentType: String(values["document.type"] ?? ""),
    documentNumber: String(values["document.number"] ?? ""),
    photoSource: String(values.photoSource ?? ""),
    photoUrl: String(values.photoUrl ?? ""),
    status: String(values.status ?? ""),
    postalCode: String(values.postalCode ?? ""),
    street: String(values.street ?? ""),
    addressNumber: String(values.addressNumber ?? ""),
    complement: String(values.complement ?? ""),
    unit: String(values.unit ?? ""),
    neighborhood: String(values.neighborhood ?? ""),
    city: String(values.city ?? ""),
    state: String(values.state ?? "") as PersonDetailsFormValues["state"],
    phone: String(values.phone ?? ""),
    email: String(values.email ?? ""),
    address: String(values.address ?? ""),
  };
}

function guardianDetailsFrom(values: Record<string, unknown>) {
  return {
    guardianId: String(values.guardianId ?? ""),
    guardianRelationship: String(values.guardianRelationship ?? ""),
    guardian: {
      firstName: String(values["guardian.firstName"] ?? ""),
      lastName: String(values["guardian.lastName"] ?? ""),
      birthDate: String(values["guardian.birthDate"] ?? ""),
      phone: String(values["guardian.phone"] ?? ""),
      email: String(values["guardian.email"] ?? ""),
      username: String(values["guardian.username"] ?? ""),
    },
  };
}

function personProfilesFrom(values: Record<string, unknown>) {
  return {
    isStudent: Boolean(values.isStudent),
    isMusician: Boolean(values.isMusician),
    student: {
      enrollmentDate: String(values["student.enrollmentDate"] ?? ""),
      classGroup: String(values["student.classGroup"] ?? ""),
      level: String(values["student.level"] ?? ""),
    },
    musician: {
      section: String(values["musician.section"] ?? ""),
      experience: String(values["musician.experience"] ?? ""),
      defaultVoice: String(values["musician.defaultVoice"] ?? ""),
      ownInstrument: Boolean(values["musician.ownInstrument"]),
      joinedAt: String(values["musician.joinedAt"] ?? ""),
      playedInstrumentId: String(values["musician.playedInstrumentId"] ?? ""),
    },
  };
}

function accessDetailsFrom(values: Record<string, unknown>) {
  return {
    username: String(values.username ?? ""),
    password: String(values.password ?? ""),
    confirmPassword: String(values.confirmPassword ?? ""),
    isActive: values.isActive !== false,
  };
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

function withAudit(values: Record<string, unknown>, current?: Record<string, unknown>): Record<string, unknown> {
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
  if (column.path === "updatedBy") return value == null || value === "" ? "system" : String(value);
  if (column.path === "visibility") {
    if (value === "public") return "Pública";
    const who = [row.visibleToStudents ? "alunos" : "", row.visibleToMusicians ? "músicos" : ""].filter(Boolean);
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
    };
    return labels[String(value)] ?? String(value ?? "—");
  }
  if (column.format === "boolean") return value ? "Sim" : "Não";
  if (column.format === "count") return String(Array.isArray(value) ? value.length : 0);
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
    return column.format === "date" ? date.toLocaleDateString("pt-BR") : date.toLocaleString("pt-BR");
  }
  if (column.format === "roles" && Array.isArray(value)) {
    return value
      .map((role) => roleChoices?.find((option) => option.value === String(role))?.label ?? roleLabels([String(role)]))
      .join(", ");
  }
  if ((column.path === "personId" || column.path === "assignedPersonId" || column.path === "guardianId") && value) {
    return personChoices?.find((option) => option.value === String(value))?.label ?? "Vinculada";
  }
  return value == null || value === "" ? "—" : String(value);
}
