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
import type { CrudField, CrudOption } from "@/domains/crudConfig";
import {
  personProfilesSchema,
  type PersonProfilesFormValues,
} from "@/domains/users/schemas/person-profiles.schema";

export type ProfilesStageHandlers = { validate: () => Promise<boolean> };

type Props = {
  values: Record<string, unknown>;
  fields: CrudField[];
  instruments: CrudOption[];
  onChange: (name: string, value: unknown) => void;
  onRegisterHandlers: (handlers: ProfilesStageHandlers | null) => void;
};

function valueAt(values: Record<string, unknown>, name: string): string {
  return String(values[name] ?? "");
}

export function UserProfilesStage({
  values,
  fields,
  instruments,
  onChange,
  onRegisterHandlers,
}: Props) {
  const form = useForm<PersonProfilesFormValues>({
    defaultValues: {
      isStudent: Boolean(values.isStudent),
      isMusician: Boolean(values.isMusician),
      student: {
        enrollmentDate: valueAt(values, "student.enrollmentDate"),
        classGroup: valueAt(values, "student.classGroup"),
        level: valueAt(values, "student.level") || "1",
      },
      musician: {
        section: valueAt(values, "musician.section"),
        experience: valueAt(values, "musician.experience") || "less_than_1",
        defaultVoice: valueAt(values, "musician.defaultVoice") || "1",
        ownInstrument: Boolean(values["musician.ownInstrument"]),
        joinedAt: valueAt(values, "musician.joinedAt"),
        playedInstrumentId: valueAt(values, "musician.playedInstrumentId"),
      },
    },
    resolver: zodResolver(personProfilesSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const { control, trigger } = form;
  const isStudent = useWatch({ control, name: "isStudent" });
  const isMusician = useWatch({ control, name: "isMusician" });

  useEffect(() => {
    onRegisterHandlers({ validate: () => trigger() });
    return () => onRegisterHandlers(null);
  }, [onRegisterHandlers, trigger]);

  const sync = (name: string) => () =>
    onChange(name, form.getValues(name as never));
  const studentFields = fields.filter((field) => field.section === "Aluno");
  const musicianFields = fields.filter((field) => field.section === "Músico");

  return (
    <FormProvider {...form}>
      <div className="grid gap-4">
        <FormStageBlock
          title="Perfis"
          description="Escolha os perfis que se aplicam. Os dados correspondentes aparecem abaixo."
          surface="plain"
          className="!pb-0"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileCheckbox
              name="isStudent"
              label="É aluno"
              onChange={(checked) => onChange("isStudent", checked)}
            />
            <ProfileCheckbox
              name="isMusician"
              label="É músico"
              onChange={(checked) => onChange("isMusician", checked)}
            />
          </div>
        </FormStageBlock>

        {isStudent ? (
          <FormStageBlock title="Aluno" surface="plain">
            <div className="grid gap-4 sm:grid-cols-2">
              {studentFields.map((field) =>
                field.type === "select" ? (
                  <ProfileSelect
                    key={field.name}
                    name={field.name as "student.level"}
                    label={field.label}
                    options={field.options ?? []}
                    required={false}
                    optionalMessage="Opcional."
                    onChange={sync(field.name)}
                  />
                ) : (
                  <FormStageField<PersonProfilesFormValues>
                    key={field.name}
                    name={
                      field.name as
                        | "student.enrollmentDate"
                        | "student.classGroup"
                    }
                    label={field.label}
                    type={field.type === "date" ? "date" : "text"}
                    placeholder={field.placeholder}
                    required={field.name === "student.enrollmentDate"}
                    optionalMessage={
                      field.name === "student.classGroup"
                        ? "Opcional."
                        : undefined
                    }
                    onEdit={sync(field.name)}
                  />
                ),
              )}
            </div>
          </FormStageBlock>
        ) : null}

        {isMusician ? (
          <FormStageBlock title="Músico" surface="plain">
            <div className="grid gap-4 sm:grid-cols-2">
              {musicianFields.map((field) => {
                if (field.type === "date") return null;
                if (field.type === "checkbox") {
                  return (
                    <ProfileCheckbox
                      key={field.name}
                      name="musician.ownInstrument"
                      label={field.label}
                      onChange={(checked) => onChange(field.name, checked)}
                    />
                  );
                }
                const options =
                  field.name === "musician.playedInstrumentId"
                    ? instruments
                    : (field.options ?? []);
                return (
                  <ProfileSelect
                    key={field.name}
                    name={
                      field.name as
                        | "musician.section"
                        | "musician.experience"
                        | "musician.defaultVoice"
                        | "musician.playedInstrumentId"
                    }
                    label={field.label}
                    options={options}
                    required={field.name === "musician.section"}
                    optionalMessage={
                      field.name === "musician.playedInstrumentId"
                        ? "Opcional durante esta etapa de desenvolvimento."
                        : field.name === "musician.section"
                          ? undefined
                          : "Opcional."
                    }
                    onChange={sync(field.name)}
                  />
                );
              })}
              {musicianFields
                .filter((field) => field.type === "date")
                .map((field) => (
                  <FormStageField<PersonProfilesFormValues>
                    key={field.name}
                    name="musician.joinedAt"
                    label={field.label}
                    type="date"
                    required={false}
                    optionalMessage="Opcional."
                    onEdit={sync(field.name)}
                  />
                ))}
            </div>
          </FormStageBlock>
        ) : null}
      </div>
    </FormProvider>
  );
}

function ProfileCheckbox({
  name,
  label,
  onChange,
}: {
  name: "isStudent" | "isMusician" | "musician.ownInstrument";
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const { control } = useFormContext<PersonProfilesFormValues>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormFieldValidationShell
          label={label}
          name={field.name}
          value={String(field.value)}
          onBlur={field.onBlur}
          state={field.value ? "valid" : "info"}
          renderControl={({ id }) => (
            <div className="flex min-h-11 items-center gap-3 text-sm text-[var(--foreground)]">
              <input
                ref={field.ref}
                id={id}
                name={field.name}
                type="checkbox"
                checked={Boolean(field.value)}
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(event);
                  onChange(event.target.checked);
                }}
                className="size-5 accent-[var(--ring)]"
              />
              <span>{field.value ? "Ativado" : "Selecionar perfil"}</span>
            </div>
          )}
        />
      )}
    />
  );
}

function ProfileSelect({
  name,
  label,
  options,
  required,
  optionalMessage,
  onChange,
}: {
  name:
    | "student.level"
    | "musician.section"
    | "musician.experience"
    | "musician.defaultVoice"
    | "musician.playedInstrumentId";
  label: string;
  options: CrudOption[];
  required: boolean;
  optionalMessage?: string;
  onChange: () => void;
}) {
  const { control } = useFormContext<PersonProfilesFormValues>();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const empty = field.value === "";
        const state: ValidationState = empty
          ? required
            ? "warning"
            : optionalMessage
              ? "warning"
              : "info"
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
            message={
              fieldState.error?.message ??
              (empty
                ? (optionalMessage ??
                  (required
                    ? "Campo obrigatório para este perfil."
                    : undefined))
                : undefined)
            }
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
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(event);
                  onChange();
                }}
                aria-required={required || undefined}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={`${controlBase} ${controlHeight.md} ${status.border} pr-3`}
              >
                <option value="">
                  {required ? "Selecione uma opção" : "Selecione (opcional)"}
                </option>
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
