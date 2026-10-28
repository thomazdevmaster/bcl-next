"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";

import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FIELD_STATUS, type ValidationState } from "@/components/forms/core";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { IconCheckbox } from "@/components/shared/IconCheckbox";
import { IconSelect } from "@/components/shared/IconSelect";
import type { CrudField, CrudOption } from "@/domains/crudConfig";
import {
  type PersonProfilesFormValues,
  personProfilesSchema,
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
        level: valueAt(values, "student.level"),
      },
      musician: {
        section: valueAt(values, "musician.section"),
        experience: valueAt(values, "musician.experience"),
        defaultVoice: valueAt(values, "musician.defaultVoice"),
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

  useEffect(() => {
    syncToParentRef.current = syncToParent;
  });

  useEffect(() => {
    onRegisterHandlers({
      validate: () => trigger(),
      syncToParent: () => syncToParentRef.current(),
    });
    return () => onRegisterHandlers(null);
  }, [onRegisterHandlers, trigger]);

  const recordKey = String(values.id ?? values.personId ?? "");
  const studentEnrollmentDate = valueAt(values, "student.enrollmentDate");
  const studentClassGroup = valueAt(values, "student.classGroup");
  const studentLevel = valueAt(values, "student.level");
  const musicianSection = valueAt(values, "musician.section");
  const musicianExperience = valueAt(values, "musician.experience");
  const musicianDefaultVoice = valueAt(values, "musician.defaultVoice");
  const musicianOwnInstrument = Boolean(values["musician.ownInstrument"]);
  const musicianJoinedAt = valueAt(values, "musician.joinedAt");
  const musicianPlayedInstrumentId = valueAt(
    values,
    "musician.playedInstrumentId",
  );
  const profileSeed = useMemo(
    () => ({
      isStudent: showStudent,
      isMusician: showMusician,
      student: {
        enrollmentDate: studentEnrollmentDate,
        classGroup: studentClassGroup,
        level: studentLevel,
      },
      musician: {
        section: musicianSection,
        experience: musicianExperience,
        defaultVoice: musicianDefaultVoice,
        ownInstrument: musicianOwnInstrument,
        joinedAt: musicianJoinedAt,
        playedInstrumentId: musicianPlayedInstrumentId,
      },
    }),
    [
      showMusician,
      showStudent,
      studentEnrollmentDate,
      studentClassGroup,
      studentLevel,
      musicianSection,
      musicianExperience,
      musicianDefaultVoice,
      musicianOwnInstrument,
      musicianJoinedAt,
      musicianPlayedInstrumentId,
    ],
  );
  const profileSeedKey = JSON.stringify(profileSeed);
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
                    required={Boolean(field.required)}
                    disabled={readOnly}
                    optionalMessage={field.required ? undefined : "Opcional."}
                    onChange={sync(field.name)}
                  />
                ) : (
                  <FormStageField<PersonProfilesFormValues>
                    key={field.name}
                    name={
                      field.name as
                        "student.enrollmentDate" | "student.classGroup"
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
                    required={Boolean(field.required)}
                    disabled={readOnly}
                    optionalMessage={field.required ? undefined : "Opcional."}
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
          renderControl={({ id, describedBy, invalid }) => (
            <IconCheckbox
              id={id}
              name={field.name}
              inputRef={field.ref}
              label={
                field.value
                  ? "Sim, possui instrumento próprio"
                  : "Não possui instrumento próprio"
              }
              icon="music_note"
              checked={Boolean(field.value)}
              disabled={disabled}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              onBlur={field.onBlur}
              onChange={(checked) => {
                field.onChange(checked);
                onChange(checked);
              }}
            />
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
        const state: ValidationState = fieldState.error
          ? "invalid"
          : empty
            ? required
              ? "warning"
              : optionalMessage
                ? "warning"
                : "info"
            : "valid";
        const status = FIELD_STATUS[state];
        const icon = {
          "student.level": "school",
          "musician.section": "groups",
          "musician.experience": "history",
          "musician.defaultVoice": "graphic_eq",
          "musician.playedInstrumentId": "music_note",
        }[name];
        const selectOptions: CrudOption[] = [
          {
            value: "",
            label: required ? "Selecione…" : "Selecione (opcional)",
            icon: "more_horiz",
          },
          ...options
            .filter((option) => option.value !== "")
            .map((option) => ({ ...option, icon: option.icon ?? icon })),
        ];
        if (
          field.value &&
          !selectOptions.some((option) => option.value === field.value)
        ) {
          selectOptions.push({
            value: field.value,
            label:
              name === "musician.playedInstrumentId"
                ? `Instrumento #${field.value}`
                : `Opção #${field.value}`,
            icon,
          });
        }
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
            renderControl={({ id, describedBy, invalid }) => (
              <IconSelect
                id={id}
                label={label}
                options={selectOptions}
                value={field.value}
                disabled={disabled}
                required={required}
                invalid={invalid}
                describedBy={describedBy}
                onTriggerRef={field.ref}
                onBlur={field.onBlur}
                triggerClassName={`${status.border} pr-3`}
                onChange={(value) => {
                  field.onChange(value);
                  onChange();
                }}
              />
            )}
          />
        );
      }}
    />
  );
}
