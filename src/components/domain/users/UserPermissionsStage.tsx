"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";

import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { IconCheckbox } from "@/components/shared/IconCheckbox";
import type { CrudField, CrudOption } from "@/domains/crudConfig";
import {
  type PermissionsFormValues,
  permissionsSchema,
} from "@/domains/users/schemas/permissions.schema";

import {
  type ProfilesStageHandlers,
  UserRoleProfileFields,
} from "./UserProfilesStage";

export type PermissionsStageHandlers = {
  validate: () => Promise<boolean>;
  syncProfiles: () => Record<string, unknown>;
};

type Props = {
  values: Record<string, unknown>;
  options: CrudOption[];
  profileFields?: CrudField[];
  instruments?: CrudOption[];
  locked: boolean;
  readOnly?: boolean;
  onChange: (name: string, value: unknown) => void;
  onRegisterHandlers: (handlers: PermissionsStageHandlers | null) => void;
};

function syncProfileFlags(
  roles: string[],
  current: { isStudent?: unknown; isMusician?: unknown },
  onChange: (name: string, value: unknown) => void,
) {
  const isStudent = roles.includes("aluno");
  const isMusician = roles.includes("musico");
  if (Boolean(current.isStudent) !== isStudent) {
    onChange("isStudent", isStudent);
  }
  if (Boolean(current.isMusician) !== isMusician) {
    onChange("isMusician", isMusician);
  }
}

export function UserPermissionsStage({
  values,
  options,
  profileFields = [],
  instruments = [],
  locked,
  readOnly = false,
  onChange,
  onRegisterHandlers,
}: Props) {
  const profileHandlers = useRef<ProfilesStageHandlers | null>(null);
  const form = useForm<PermissionsFormValues>({
    defaultValues: {
      roles: Array.isArray(values.roles)
        ? (values.roles.map(String) as PermissionsFormValues["roles"])
        : [],
    },
    resolver: zodResolver(permissionsSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const { control, trigger, watch } = form;
  const selectedRoles = watch("roles");
  const showStudent = selectedRoles.includes("aluno");
  const showMusician = selectedRoles.includes("musico");

  useEffect(() => {
    onRegisterHandlers({
      syncProfiles: () => {
        const roles = form.getValues("roles").map(String);
        const profilePatch = profileHandlers.current?.syncToParent?.() ?? {};
        return {
          roles,
          isStudent: roles.includes("aluno"),
          isMusician: roles.includes("musico"),
          ...profilePatch,
        };
      },
      validate: async () => {
        const rolesValid = await trigger();
        const profileValid =
          showStudent || showMusician
            ? await (profileHandlers.current?.validate() ?? true)
            : true;
        return rolesValid && profileValid;
      },
    });
    return () => onRegisterHandlers(null);
  }, [form, onRegisterHandlers, showMusician, showStudent, trigger]);

  const rolesKey = selectedRoles.slice().sort().join("|");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    syncProfileFlags(selectedRoles, values, (name, value) =>
      onChangeRef.current(name, value),
    );
  }, [rolesKey, selectedRoles, values.isMusician, values.isStudent]);

  return (
    <FormProvider {...form}>
      <div className="grid gap-4">
        <FormStageBlock
          title="Permissões"
          description={
            readOnly
              ? "Papéis atribuídos a esta conta. Marque aluno ou músico para completar os dados do perfil abaixo."
              : "Escolha os papéis da conta. Ao marcar aluno ou músico, preencha os dados correspondentes nesta etapa."
          }
          surface="plain"
          className="!pb-0"
        >
          <Controller
            name="roles"
            control={control}
            render={({ field, fieldState }) => {
              const selected = field.value;
              const state = fieldState.error
                ? "invalid"
                : locked || readOnly
                  ? "info"
                  : selected.length > 0
                    ? "valid"
                    : "warning";
              const message =
                fieldState.error?.message ??
                (readOnly
                  ? "Visualização somente leitura."
                  : locked
                    ? "Somente um administrador pode alterar os papéis desta conta."
                    : selected.length === 0
                      ? "Opcional. Amigos é o perfil padrão de quem entra com Google."
                      : undefined);

              return (
                <FormFieldValidationShell
                  label="Papéis da conta"
                  name={field.name}
                  value={selected.join(",")}
                  onBlur={field.onBlur}
                  state={state}
                  message={message}
                  labelForControl={false}
                  renderControl={({ id, labelId, describedBy, invalid }) => (
                    <div
                      id={id}
                      role="group"
                      aria-labelledby={labelId}
                      aria-describedby={describedBy}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {options.length === 0 ? (
                        <p className="px-2 py-2 text-sm text-[var(--muted)] sm:col-span-2">
                          Nenhum papel disponível.
                        </p>
                      ) : (
                        options.map((option) => {
                          const checked = selected.includes(option.value);
                          const checkboxId = `${id}-${option.value}`;
                          return (
                            <IconCheckbox
                              key={option.value}
                              id={checkboxId}
                              name={field.name}
                              value={option.value}
                              inputRef={
                                option === options[0] ? field.ref : undefined
                              }
                              label={option.label}
                              icon={
                                option.icon ??
                                {
                                  amigos: "groups",
                                  aluno: "school",
                                  musico: "music_note",
                                  maestro: "campaign",
                                  admin: "admin_panel_settings",
                                }[option.value] ??
                                "badge"
                              }
                              checked={checked}
                              disabled={locked || readOnly}
                              aria-invalid={invalid || undefined}
                              onBlur={field.onBlur}
                              onChange={(nextChecked) => {
                                const next = nextChecked
                                  ? [...selected, option.value]
                                  : selected.filter(
                                      (role) => role !== option.value,
                                    );
                                field.onChange(next);
                                onChange("roles", next);
                                syncProfileFlags(next, values, onChange);
                              }}
                              className={
                                invalid ? "!border-[var(--destructive)]" : ""
                              }
                            />
                          );
                        })
                      )}
                    </div>
                  )}
                />
              );
            }}
          />
        </FormStageBlock>

        {profileFields.length > 0 && (showStudent || showMusician) ? (
          <UserRoleProfileFields
            values={values}
            fields={profileFields}
            instruments={instruments}
            showStudent={showStudent}
            showMusician={showMusician}
            readOnly={readOnly}
            onChange={onChange}
            onRegisterHandlers={(handlers) => {
              profileHandlers.current = handlers;
            }}
          />
        ) : null}
      </div>
    </FormProvider>
  );
}
