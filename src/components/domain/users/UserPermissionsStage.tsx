"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import {
  controlBase,
  FIELD_STATUS,
  type ValidationState,
} from "@/components/forms/core";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import type { CrudOption } from "@/domains/crudConfig";
import {
  permissionsSchema,
  type PermissionsFormValues,
} from "@/domains/users/schemas/permissions.schema";

export type PermissionsStageHandlers = { validate: () => Promise<boolean> };

type Props = {
  values: Record<string, unknown>;
  options: CrudOption[];
  locked: boolean;
  readOnly?: boolean;
  onChange: (name: string, value: unknown) => void;
  onRegisterHandlers: (handlers: PermissionsStageHandlers | null) => void;
};

export function UserPermissionsStage({
  values,
  options,
  locked,
  readOnly = false,
  onChange,
  onRegisterHandlers,
}: Props) {
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
  const { control, trigger } = form;

  useEffect(() => {
    onRegisterHandlers({ validate: () => trigger() });
    return () => onRegisterHandlers(null);
  }, [onRegisterHandlers, trigger]);

  return (
    <FormProvider {...form}>
      <FormStageBlock
        title="Permissões"
        description={
          readOnly
            ? "Papéis atribuídos a esta conta. As permissões concedidas se somam."
            : "Escolha os papéis adicionais que esta conta poderá exercer. As permissões concedidas se somam."
        }
        surface="plain"
        className="!pb-0"
      >
        <Controller
          name="roles"
          control={control}
          render={({ field, fieldState }) => {
            const selected = field.value;
            const state: ValidationState = fieldState.error
              ? "invalid"
              : locked || readOnly
                ? "info"
                : selected.length > 0
                  ? "valid"
                  : "warning";
            const status = FIELD_STATUS[state];
            const message =
              fieldState.error?.message ??
              (readOnly
                ? "Visualização somente leitura."
                : locked
                  ? "Somente um administrador pode alterar os papéis desta conta."
                : selected.length === 0
                  ? "Opcional. Os papéis de aluno e músico seguem os perfis cadastrados para a pessoa."
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
                    className={`${controlBase} ${status.border} grid gap-1 p-2 pr-3 sm:grid-cols-2`}
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
                          <label
                            key={option.value}
                            htmlFor={checkboxId}
                            className={`flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-2 text-sm ${locked || readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[var(--accent)]"}`}
                          >
                            <input
                              ref={
                                option === options[0] ? field.ref : undefined
                              }
                              id={checkboxId}
                              name={field.name}
                              type="checkbox"
                              value={option.value}
                              checked={checked}
                              disabled={locked || readOnly}
                              aria-invalid={invalid || undefined}
                              onBlur={field.onBlur}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...selected, option.value]
                                  : selected.filter(
                                      (role) => role !== option.value,
                                    );
                                field.onChange(next);
                                onChange("roles", next);
                              }}
                              className="size-5 shrink-0 accent-[var(--ring)]"
                            />
                            <span className="truncate">{option.label}</span>
                          </label>
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
    </FormProvider>
  );
}
