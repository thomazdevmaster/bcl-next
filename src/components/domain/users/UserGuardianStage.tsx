"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import {
  controlBase,
  controlHeight,
  FIELD_STATUS,
  type ValidationState,
} from "@/components/forms/core";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { formatPhoneNumber } from "@/domains/people/formatting";
import type { CrudOption } from "@/domains/crudConfig";
import {
  guardianSchema,
  type GuardianFormValues,
} from "@/domains/users/schemas/guardian.schema";

export const NEW_GUARDIAN_VALUE = "__new_guardian__";

export type GuardianStageHandlers = {
  validate: () => Promise<boolean>;
};

type GuardianPersonChoice = CrudOption & { hasUser: boolean };

type Props = {
  values: Record<string, unknown>;
  people: GuardianPersonChoice[];
  relationshipOptions: CrudOption[];
  onChange: (name: string, value: unknown) => void;
  onRegisterHandlers: (handlers: GuardianStageHandlers | null) => void;
};

function stringValue(values: Record<string, unknown>, name: string): string {
  return String(values[name] ?? "");
}

function localToday(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function UserGuardianStage({
  values,
  people,
  relationshipOptions,
  onChange,
  onRegisterHandlers,
}: Props) {
  const form = useForm<GuardianFormValues>({
    defaultValues: {
      guardianId: stringValue(values, "guardianId"),
      guardianRelationship: stringValue(values, "guardianRelationship"),
      guardian: {
        firstName: stringValue(values, "guardian.firstName"),
        lastName: stringValue(values, "guardian.lastName"),
        birthDate: stringValue(values, "guardian.birthDate"),
        phone: stringValue(values, "guardian.phone"),
        email: stringValue(values, "guardian.email"),
        username: stringValue(values, "guardian.username"),
      },
    },
    resolver: zodResolver(guardianSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const { control, trigger, setValue } = form;
  const guardianId = useWatch({ control, name: "guardianId" });
  const today = localToday();

  useEffect(() => {
    onRegisterHandlers({ validate: () => trigger() });
    return () => onRegisterHandlers(null);
  }, [onRegisterHandlers, trigger]);

  const syncFlatValue =
    (
      path:
        | keyof GuardianFormValues
        | `guardian.${keyof GuardianFormValues["guardian"]}`,
    ) =>
    () => {
      if (path.startsWith("guardian.")) {
        const field = path.slice(
          "guardian.".length,
        ) as keyof GuardianFormValues["guardian"];
        onChange(path, form.getValues(`guardian.${field}`));
      } else if (path === "guardianId" || path === "guardianRelationship") {
        onChange(path, form.getValues(path));
      }
    };

  return (
    <FormProvider {...form}>
      <div className="grid gap-4">
        <FormStageBlock title="Responsável" surface="plain" className="!pb-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <GuardianSelectField
              name="guardianId"
              label="Pessoa responsável"
              required
              options={[
                { value: "", label: "Selecione um usuário…" },
                ...people.filter((person) => person.hasUser),
                { value: NEW_GUARDIAN_VALUE, label: "Novo responsável" },
              ]}
              emptyMessage="Selecione um usuário existente ou escolha Novo responsável."
              onValueChange={(value) => {
                onChange("guardianId", value);
                if (value !== NEW_GUARDIAN_VALUE) {
                  for (const field of [
                    "firstName",
                    "lastName",
                    "birthDate",
                    "phone",
                    "email",
                    "username",
                  ] as const) {
                    setValue(`guardian.${field}`, "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    onChange(`guardian.${field}`, "");
                  }
                }
              }}
            />
            <GuardianSelectField
              name="guardianRelationship"
              label="Parentesco"
              required={Boolean(guardianId)}
              emptyMessage={
                guardianId
                  ? "Selecione o parentesco."
                  : "Opcional até selecionar a pessoa responsável."
              }
              options={relationshipOptions}
              onValueChange={(value) => onChange("guardianRelationship", value)}
            />
          </div>
        </FormStageBlock>

        {guardianId === NEW_GUARDIAN_VALUE ? (
          <FormStageBlock title="Cadastrar novo responsável" surface="plain">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormStageField<GuardianFormValues>
                name="guardian.firstName"
                label="Nome"
                autoComplete="given-name"
                required
                onEdit={syncFlatValue("guardian.firstName")}
              />
              <FormStageField<GuardianFormValues>
                name="guardian.lastName"
                label="Sobrenome"
                autoComplete="family-name"
                required
                onEdit={syncFlatValue("guardian.lastName")}
              />
              <FormStageField<GuardianFormValues>
                name="guardian.birthDate"
                label="Data de nascimento"
                type="date"
                max={today}
                required
                onEdit={syncFlatValue("guardian.birthDate")}
              />
              <FormStageField<GuardianFormValues>
                name="guardian.phone"
                label="Telefone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                formatValue={formatPhoneNumber}
                required
                onEdit={syncFlatValue("guardian.phone")}
              />
              <FormStageField<GuardianFormValues>
                name="guardian.email"
                label="E-mail"
                type="email"
                autoComplete="email"
                required={false}
                optionalMessage="Opcional."
                validateOnChange="guardian.email"
                onEdit={syncFlatValue("guardian.email")}
              />
              <FormStageField<GuardianFormValues>
                name="guardian.username"
                label="Nome de usuário"
                autoComplete="username"
                placeholder="nome.sobrenome"
                formatValue={(value) =>
                  value.toLowerCase().replace(/\s+/g, ".")
                }
                required={false}
                optionalMessage="Opcional; em branco, será gerado automaticamente."
                onEdit={syncFlatValue("guardian.username")}
              />
            </div>
          </FormStageBlock>
        ) : null}
      </div>
    </FormProvider>
  );
}

function GuardianSelectField({
  name,
  label,
  options,
  required,
  emptyMessage,
  onValueChange,
}: {
  name: "guardianId" | "guardianRelationship";
  label: string;
  options: CrudOption[];
  required: boolean;
  emptyMessage: string;
  onValueChange: (value: string) => void;
}) {
  const { control } = useFormContext<GuardianFormValues>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const empty = field.value === "";
        const state: ValidationState = empty
          ? "warning"
          : fieldState.error
            ? "invalid"
            : "valid";
        const status = FIELD_STATUS[state];
        return (
          <FormFieldValidationShell
            label={label}
            name={field.name}
            required={required}
            value={field.value}
            onBlur={field.onBlur}
            state={state}
            message={empty ? emptyMessage : fieldState.error?.message}
            renderControl={({
              id,
              name: controlName,
              describedBy,
              invalid,
            }) => (
              <select
                ref={field.ref}
                id={id}
                name={controlName}
                value={field.value}
                onChange={(event) => {
                  field.onChange(event);
                  onValueChange(event.target.value);
                }}
                aria-required={required || undefined}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={`${controlBase} ${controlHeight.md} ${status.border} pr-3`}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          />
        );
      }}
    />
  );
}
