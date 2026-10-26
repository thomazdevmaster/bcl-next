"use client";

import { useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
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

export type ProfilesStageHandlers = {
  validate: () => Promise<boolean>;
  /** Copia aluno/músico do formulário interno para o payload de salvamento. */
  syncToParent: () => Record<string, unknown>;
};

type Props = {
  values: Record<string, unknown>;
  fields: CrudField[];
  instruments: CrudOption[];
  onChange: (name: string, value: unknown) => void;
  onRegisterHandlers: (handlers: ProfilesStageHandlers | null) => void;
  readOnly?: boolean;
};

function valueAt(values: Record<string, unknown>, name: string): string {
  return String(values[name] ?? "");
}

export function UserRoleProfileFields({
  values,
  fields,
  instruments,
  showStudent,
  showMusician,
  onChange,
  onRegisterHandlers,
  readOnly = false,
}: Props & { showStudent: boolean; showMusician: boolean }) {
  const form = useForm<PersonProfilesFormValues>({
    defaultValues: {
      isStudent: showStudent,
      isMusician: showMusician,
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
  const { trigger, getValues } = form;

  const syncToParent = () => {
    const current = getValues();
    return {
      isStudent: current.isStudent,
      isMusician: current.isMusician,
      "student.enrollmentDate": current.student.enrollmentDate,
      "student.classGroup": current.student.classGroup,
      "student.level": current.student.level,
      "musician.section": current.musician.section,
      "musician.experience": current.musician.experience,
      "musician.defaultVoice": current.musician.defaultVoice,
      "musician.ownInstrument": current.musician.ownInstrument,
      "musician.joinedAt": current.musician.joinedAt,
      "musician.playedInstrumentId": current.musician.playedInstrumentId,
    };
  };

  const syncToParentRef = useRef(syncToParent);
  syncToParentRef.current = syncToParent;

  useEffect(() => {
    onRegisterHandlers({
      validate: () => trigger(),
      syncToParent: () => syncToParentRef.current(),
    });
    return () => onRegisterHandlers(null);
  }, [onRegisterHandlers, trigger]);

  const recordKey = String(values.id ?? values.personId ?? "");
  const profileSeed = useMemo(
    () => ({
      isStudent: showStudent,
      isMusician: showMusician,
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
    }),
    [
      recordKey,
      showMusician,
      showStudent,
      values["musician.experience"],
      values["musician.joinedAt"],
      values["musician.playedInstrumentId"],
      values["musician.section"],
      values["student.enrollmentDate"],
      values["student.classGroup"],
      values["student.level"],
      values["musician.ownInstrument"],
      values["musician.defaultVoice"],
    ],
  );

  const profileSeedKey = useMemo(
    () => JSON.stringify(profileSeed),
    [profileSeed],
  );
  const lastProfileSeedKey = useRef<string | null>(null);
  const lastRecordKey = useRef(recordKey);

  useEffect(() => {
    const recordChanged = lastRecordKey.current !== recordKey;
    lastRecordKey.current = recordKey;

    if (recordChanged || lastProfileSeedKey.current !== profileSeedKey) {
      lastProfileSeedKey.current = profileSeedKey;
      form.reset(profileSeed);
      return;
    }

    form.setValue("isStudent", showStudent, { shouldDirty: false });
    form.setValue("isMusician", showMusician, { shouldDirty: false });
  }, [form, profileSeed, profileSeedKey, recordKey, showMusician, showStudent]);

  const sync = (name: string) => () =>
    onChange(name, form.getValues(name as never));
  const studentFields = fields.filter((field) => field.section === "Aluno");
  const musicianFields = fields.filter((field) => field.section === "Músico");

  return (
    <FormProvider {...form}>
      <div className="grid gap-4">
        {showStudent ? (
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
                    disabled={readOnly}
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
                    disabled={readOnly}
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

        {showMusician ? (
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
                      disabled={readOnly}
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
                    required={
                      field.name === "musician.section" ||
                      field.name === "musician.playedInstrumentId"
                    }
                    disabled={readOnly}
                    optionalMessage={
                      field.name === "musician.section" ||
                      field.name === "musician.playedInstrumentId"
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
                    disabled={readOnly}
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
  disabled = false,
  onChange,
}: {
  name: "musician.ownInstrument";
  label: string;
  disabled?: boolean;
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
          description="Marque se o músico usa instrumento próprio, fora do patrimônio da banda."
          labelForControl={false}
          renderControl={({ id, labelId, describedBy, invalid }) => (
            <label
              htmlFor={id}
              className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--foreground)]"
            >
              <input
                ref={field.ref}
                id={id}
                name={field.name}
                type="checkbox"
                disabled={disabled}
                checked={Boolean(field.value)}
                onBlur={field.onBlur}
                aria-labelledby={labelId}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                onChange={(event) => {
                  field.onChange(event.target.checked);
                  onChange(event.target.checked);
                }}
                className="size-5 shrink-0 accent-[var(--ring)] disabled:cursor-not-allowed"
              />
              <span>{field.value ? "Sim, possui instrumento próprio" : "Não possui instrumento próprio"}</span>
            </label>
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
  disabled = false,
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
  disabled?: boolean;
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
            disabled={disabled}
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
                disabled={disabled}
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
