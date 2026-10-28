"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type DefaultValues,
  type FieldPath,
  type FieldPathByValue,
  FormProvider,
  type UseFormReturn,
  useController,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";

import { FormStageActions } from "@/components/forms/FormStageActions";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FormStageProgress } from "@/components/forms/FormStageProgress";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { IconCheckbox } from "@/components/shared/IconCheckbox";
import { IconSelect } from "@/components/shared/IconSelect";
import type {
  CrudField,
  CrudFormStage,
  CrudOption,
} from "@/domains/crudConfig";
import type { DomainCrudFormResource } from "@/domains/crudConfig";
import {
  type DomainCrudFormValues,
  domainCrudFormSchema,
} from "@/domains/crudFormSchema";
import { formatPhoneNumber } from "@/domains/people/formatting";
import {
  isMusicXmlUploadFile,
  looksLikeMusicXml,
  metadataFromMusicXml,
} from "@/domains/songs/musicXmlMetadata";
import { youtubeEmbedUrl, youtubeWatchUrl } from "@/domains/songs/youtube";
import { extractInstrumentsFromXml } from "@/study/studyUtils";

export interface EntityFormDynamicChoices {
  people: Array<CrudOption & { hasUser: boolean }> | null;
  instruments: CrudOption[] | null;
}

export interface EntityFormProps {
  resource: DomainCrudFormResource;
  fields: CrudField[];
  values: Record<string, unknown>;
  readOnly: boolean;
  editing: boolean;
  saving: boolean;
  error: string | null;
  dynamicChoices: EntityFormDynamicChoices;
  stages: CrudFormStage[];
  onSubmit: (
    values: Record<string, unknown>,
  ) => Promise<Record<string, string> | undefined>;
  onEdit?: () => void;
}

const buttonMotion =
  "transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";

export function EntityForm({
  resource,
  fields,
  values,
  readOnly,
  editing,
  saving,
  error,
  dynamicChoices,
  stages,
  onSubmit,
  onEdit,
}: EntityFormProps) {
  const form = useForm<DomainCrudFormValues>({
    resolver: zodResolver(domainCrudFormSchema),
    defaultValues: makeFormDefaults(
      resource,
      fields,
      values,
      !editing && !readOnly,
    ) as DefaultValues<DomainCrudFormValues>,
    shouldUnregister: false,
    mode: "onTouched",
  });
  const watched = useWatch({ control: form.control });
  const flatValues = toCrudValues(watched);
  const [activeStage, setActiveStage] = useState(0);
  const [maxReachable, setMaxReachable] = useState(
    readOnly ? stages.length - 1 : 0,
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const currentStage = stages[activeStage] ?? stages[0];
  const visibleFields = fields.filter(
    (field) =>
      currentStage.fields.includes(field.name) &&
      (!field.showWhen || field.showWhen(flatValues)),
  );
  const hasSections = visibleFields.some((field) => field.section);
  const stageStatuses = getStageStatuses(stages, form, maxReachable);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    const firstError = currentStage.fields.find((name) =>
      Boolean(
        form.getFieldState(
          toFormFieldName(name) as FieldPath<DomainCrudFormValues>,
        ).error,
      ),
    );
    if (!firstError) return;
    requestAnimationFrame(() =>
      form.setFocus(
        toFormFieldName(firstError) as FieldPath<DomainCrudFormValues>,
      ),
    );
  }, [activeStage, currentStage, form]);

  const validateStage = async (stage: CrudFormStage) => {
    const fieldPaths = stage.fields.map(
      toFormFieldName,
    ) as FieldPath<DomainCrudFormValues>[];
    return form.trigger(fieldPaths, { shouldFocus: true });
  };

  const goToNextStage = async () => {
    const valid = await validateStage(currentStage);
    if (!valid || activeStage >= stages.length - 1) return;
    const nextStage = activeStage + 1;
    setActiveStage(nextStage);
    setMaxReachable((current) => Math.max(current, nextStage));
  };

  const selectStage = (stageId: string) => {
    const targetIndex = stages.findIndex((stage) => stage.id === stageId);
    if (targetIndex < 0) return;
    if (readOnly || targetIndex <= maxReachable) {
      setActiveStage(targetIndex);
    } else if (targetIndex === activeStage + 1) {
      void goToNextStage();
    }
  };

  const handleSubmit = async () => {
    await form.handleSubmit(
      async (parsedValues) => {
        const result = await onSubmit(toCrudValues(parsedValues));
        if (!result) return;
        for (const [name, message] of Object.entries(result)) {
          form.setError(
            toFormFieldName(name) as FieldPath<DomainCrudFormValues>,
            {
              type: "validate",
              message,
            },
          );
        }
        const firstErrorStage = stages.findIndex((stage) =>
          stage.fields.some((name) =>
            Boolean(
              form.getFieldState(
                toFormFieldName(name) as FieldPath<DomainCrudFormValues>,
              ).error,
            ),
          ),
        );
        if (firstErrorStage >= 0) {
          const firstError = stages[firstErrorStage].fields.find((name) =>
            Boolean(
              form.getFieldState(
                toFormFieldName(name) as FieldPath<DomainCrudFormValues>,
              ).error,
            ),
          );
          setActiveStage(firstErrorStage);
          if (firstError) {
            requestAnimationFrame(() =>
              form.setFocus(
                toFormFieldName(firstError) as FieldPath<DomainCrudFormValues>,
              ),
            );
          }
        }
      },
      (errors) => {
        const firstErrorStage = stages.findIndex((stage) =>
          stage.fields.some((name) =>
            hasNestedError(errors, toFormFieldName(name)),
          ),
        );
        if (firstErrorStage >= 0) {
          const firstError = stages[firstErrorStage].fields.find((name) =>
            hasNestedError(errors, toFormFieldName(name)),
          );
          setActiveStage(firstErrorStage);
          if (firstError) {
            requestAnimationFrame(() =>
              form.setFocus(
                toFormFieldName(firstError) as FieldPath<DomainCrudFormValues>,
              ),
            );
          }
        }
      },
    )();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeStage < stages.length - 1) void goToNextStage();
    else void handleSubmit();
  };

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={handleFormSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        {stages.length > 1 ? (
          <div className="shrink-0 border-b border-[var(--border)] px-4 pt-3 sm:px-6 sm:pt-4">
            <div className="relative mb-3 min-w-0 md:hidden">
              <IconSelect
                label="Etapas do formulário"
                options={stages.map((stage) => ({
                  value: stage.id,
                  label: stage.shortTitle,
                  icon: stage.icon,
                }))}
                value={currentStage.id}
                onChange={selectStage}
                className="relative w-full"
              />
            </div>
            <div className="hidden md:block">
              <FormStageProgress
                stages={stages}
                active={activeStage}
                maxReachable={readOnly ? stages.length - 1 : maxReachable}
                statuses={stageStatuses}
                onSelect={(index) => selectStage(stages[index].id)}
                ariaLabel="Etapas do formulário"
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p
            className="mx-4 mt-3 rounded-xl border border-[var(--destructive)]/40 px-4 py-3 text-sm text-[var(--destructive)] sm:mx-6"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div
          ref={contentRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
        >
          <FormStageBlock
            id={`form-stage-${activeStage}`}
            title={currentStage.title}
            surface="plain"
            className="border-t-0 py-0"
          >
            <div className="grid min-w-0 gap-x-4 gap-y-5 md:grid-cols-2">
              {visibleFields.map((field, index) => {
                const previousSection = visibleFields[index - 1]?.section;
                const heading =
                  hasSections &&
                  field.section &&
                  field.section !== previousSection
                    ? field.section
                    : null;
                const wide =
                  field.wide === true ||
                  field.type === "textarea" ||
                  field.type === "xml" ||
                  field.type === "multiselect";

                return (
                  <FieldSlot key={field.name} heading={heading} wide={wide}>
                    <CrudFormField
                      field={field}
                      values={flatValues}
                      dynamicChoices={dynamicChoices}
                      readOnly={readOnly}
                      editing={editing}
                    />
                  </FieldSlot>
                );
              })}
            </div>
          </FormStageBlock>
        </div>

        <footer className="flex shrink-0 items-center justify-end border-t border-[var(--border)] bg-[var(--card)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
          {readOnly ? (
            onEdit ? (
              <button
                type="button"
                className={`btn-primary min-h-11 flex-1 px-4 sm:flex-none ${buttonMotion}`}
                onClick={onEdit}
              >
                Editar
              </button>
            ) : null
          ) : (
            <div className="min-w-0 flex-1">
              <FormStageActions
                active={activeStage}
                total={stages.length}
                busy={saving}
                className="justify-end !pt-0"
                onBack={() =>
                  setActiveStage((current) => Math.max(0, current - 1))
                }
                onNext={() => void goToNextStage()}
                onSubmit={() => void handleSubmit()}
                continueLabel="Continuar"
                submitLabel={editing ? "Salvar alterações" : "Salvar"}
                pendingLabel="Salvando…"
              />
            </div>
          )}
        </footer>
      </form>
    </FormProvider>
  );
}

function CrudFormField({
  field,
  values,
  dynamicChoices,
  readOnly,
  editing,
}: {
  field: CrudField;
  values: Record<string, unknown>;
  dynamicChoices: EntityFormDynamicChoices;
  readOnly: boolean;
  editing: boolean;
}) {
  const formName = toFormFieldName(field.name);
  const fieldPath = formName as FieldPath<DomainCrudFormValues>;
  const disabled = readOnly || (editing && Boolean(field.lockOnEdit));
  const formatValue = (value: string) =>
    field.type === "tel"
      ? formatPhoneNumber(value)
      : field.format
        ? field.format(value, values)
        : value;

  if (
    field.type !== "checkbox" &&
    field.type !== "select" &&
    field.type !== "multiselect" &&
    field.type !== "textarea" &&
    field.type !== "xml"
  ) {
    return (
      <FormStageField<DomainCrudFormValues>
        name={fieldPath as FieldPathByValue<DomainCrudFormValues, string>}
        label={field.label}
        type={field.type ?? "text"}
        placeholder={field.placeholder}
        required={field.required ?? false}
        readOnly={disabled}
        infoMessage={field.helpText}
        optionalMessage={field.required ? undefined : "Opcional"}
        inputMode={
          field.type === "tel"
            ? "tel"
            : field.type === "number"
              ? "decimal"
              : undefined
        }
        autoComplete={field.type === "password" ? "new-password" : undefined}
        step={field.type === "number" ? "0.01" : undefined}
        formatValue={formatValue}
        className="min-w-0"
      />
    );
  }

  return (
    <ControlledCrudField
      field={field}
      fieldPath={fieldPath}
      values={values}
      dynamicChoices={dynamicChoices}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}

function ControlledCrudField({
  field,
  fieldPath,
  values,
  dynamicChoices,
  disabled,
  readOnly,
}: {
  field: CrudField;
  fieldPath: FieldPath<DomainCrudFormValues>;
  values: Record<string, unknown>;
  dynamicChoices: EntityFormDynamicChoices;
  disabled: boolean;
  readOnly: boolean;
}) {
  const { control, clearErrors, setError, setValue } =
    useFormContext<DomainCrudFormValues>();
  const { field: controllerField, fieldState } = useController({
    control,
    name: fieldPath,
  });
  const value = controllerField.value;
  const message = fieldState.error?.message;
  const state = fieldState.invalid
    ? "invalid"
    : fieldState.isTouched || fieldState.isDirty
      ? "valid"
      : "info";
  const options = optionsForField(field, values, dynamicChoices);
  const description =
    field.helpText ?? (!field.required ? "Opcional" : undefined);
  const fieldRequired = field.required ?? false;

  const setFileFieldValue = (name: string, nextValue: unknown) => {
    setValue(
      toFormFieldName(name) as FieldPath<DomainCrudFormValues>,
      nextValue as never,
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    clearErrors(fieldPath);
    if (!isMusicXmlUploadFile(file)) {
      input.value = "";
      setError(fieldPath, {
        type: "validate",
        message:
          "Formato não aceito. Envie apenas MusicXML (.xml ou .musicxml). Exporte a partitura como MusicXML e tente novamente.",
      });
      return;
    }
    try {
      const content = await file.text();
      if (!looksLikeMusicXml(content)) {
        input.value = "";
        setError(fieldPath, {
          type: "validate",
          message:
            "O arquivo não parece ser MusicXML válido. Confira a exportação e tente novamente.",
        });
        return;
      }
      if (extractInstrumentsFromXml(content).length === 0) {
        input.value = "";
        setError(fieldPath, {
          type: "validate",
          message:
            "A partitura não define naipes utilizáveis. Exporte como MusicXML partwise com a lista de instrumentos.",
        });
        return;
      }
      const encoded = `data:${file.type || "application/xml"};base64,${btoa(unescape(encodeURIComponent(content)))}`;
      setFileFieldValue("scoreFile", encoded);
      setFileFieldValue("scoreFileName", file.name);
      setFileFieldValue("scoreMimeType", file.type || "application/xml");
      const metadata = metadataFromMusicXml(content);
      for (const name of [
        "title",
        "composer",
        "arranger",
        "genre",
        "key",
      ] as const) {
        if (metadata[name]) setFileFieldValue(name, metadata[name]);
      }
      if (metadata.durationSeconds != null) {
        setFileFieldValue("durationSeconds", String(metadata.durationSeconds));
      }
    } catch {
      setError(fieldPath, {
        type: "validate",
        message:
          "Não foi possível ler a partitura. Confira o arquivo e tente novamente.",
      });
    }
  };

  const videoWatch =
    field.name === "videoUrl" ? youtubeWatchUrl(String(value ?? "")) : null;
  const videoEmbed =
    field.name === "videoUrl" ? youtubeEmbedUrl(String(value ?? "")) : null;

  return (
    <FormFieldValidationShell
      label={field.label}
      name={fieldPath}
      description={description}
      required={fieldRequired}
      disabled={disabled}
      state={state}
      message={message}
      placeholder={field.placeholder}
      labelForControl={
        field.type !== "multiselect" &&
        field.type !== "checkbox" &&
        !(field.type === "xml" && readOnly)
      }
      labelClassName={field.type === "checkbox" ? "sr-only" : undefined}
      renderControl={({ id, labelId, describedBy, invalid, className }) => {
        if (field.type === "checkbox") {
          return (
            <IconCheckbox
              id={id}
              name={controllerField.name}
              inputRef={controllerField.ref}
              label={field.label}
              icon={field.icon}
              checked={Boolean(value)}
              disabled={disabled}
              required={fieldRequired}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              onBlur={controllerField.onBlur}
              onChange={controllerField.onChange}
            />
          );
        }

        if (field.type === "select") {
          return (
            <IconSelect
              id={id}
              label={field.label}
              options={options}
              value={String(value ?? "")}
              disabled={disabled}
              required={fieldRequired}
              invalid={invalid}
              describedBy={describedBy}
              onTriggerRef={controllerField.ref}
              triggerClassName={`${className} !pr-3`}
              onBlur={controllerField.onBlur}
              onChange={controllerField.onChange}
            />
          );
        }

        if (field.type === "textarea") {
          return (
            <textarea
              ref={controllerField.ref}
              id={id}
              name={controllerField.name}
              rows={4}
              value={String(value ?? "")}
              readOnly={disabled}
              placeholder={field.placeholder}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              className={`${className} min-h-28 resize-y`}
              onBlur={controllerField.onBlur}
              onChange={(event) => controllerField.onChange(event.target.value)}
            />
          );
        }

        if (field.type === "multiselect") {
          const selectedValues = Array.isArray(value) ? value.map(String) : [];
          return (
            <div
              id={id}
              role="group"
              aria-labelledby={labelId}
              aria-describedby={describedBy}
              className="grid gap-1 rounded-xl border border-[var(--border)] p-2 sm:grid-cols-2"
            >
              {options.length === 0 ? (
                <p className="px-2 py-2 text-sm text-[var(--muted)]">
                  Nenhuma opção disponível.
                </p>
              ) : (
                options.map((option) => (
                  <label
                    key={option.value}
                    className="flex min-h-11 items-center gap-2 px-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option.value)}
                      disabled={disabled}
                      className="h-5 w-5 accent-[var(--primary)]"
                      onChange={(event) =>
                        controllerField.onChange(
                          event.target.checked
                            ? [...selectedValues, option.value]
                            : selectedValues.filter(
                                (item) => item !== option.value,
                              ),
                        )
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))
              )}
            </div>
          );
        }

        if (field.type === "xml") {
          const fileName = String(values.scoreFileName ?? "");
          if (readOnly) {
            return (
              <p
                id={id}
                aria-describedby={describedBy}
                className="min-h-11 rounded-xl bg-[var(--card-secondary)] px-3 py-2"
              >
                {fileName || "Nenhuma partitura anexada"}
              </p>
            );
          }
          return (
            <div className="flex min-h-11 flex-wrap items-center gap-3">
              <input
                ref={controllerField.ref}
                id={id}
                name={controllerField.name}
                type="file"
                accept={field.accept}
                className="sr-only"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                onBlur={controllerField.onBlur}
                onChange={(event) => void handleFile(event)}
              />
              <button
                type="button"
                disabled={disabled}
                className={`btn-primary inline-flex min-h-11 items-center px-4 ${buttonMotion}`}
                onClick={() => document.getElementById(id)?.click()}
              >
                Enviar arquivo
              </button>
              {fileName ? (
                <span className="min-w-0 break-all text-xs text-[var(--muted)]">
                  Arquivo: {fileName}
                </span>
              ) : null}
            </div>
          );
        }

        if (field.name === "videoUrl" && readOnly) {
          return videoWatch && videoEmbed ? (
            <div
              id={id}
              aria-labelledby={labelId}
              className="flex flex-col items-start gap-2"
            >
              <div className="aspect-video w-full max-w-80 overflow-hidden rounded-xl bg-black">
                <iframe
                  className="h-full w-full"
                  src={videoEmbed}
                  title="Vídeo da música"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <a
                href={videoWatch}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--color-brand-strong)] underline-offset-4 hover:underline"
              >
                <span className="material-icons text-lg" aria-hidden="true">
                  smart_display
                </span>
                Abrir no YouTube
              </a>
            </div>
          ) : (
            <p
              id={id}
              className="min-h-11 rounded-xl bg-[var(--card-secondary)] px-3 py-2"
            >
              Nenhum vídeo
            </p>
          );
        }

        return (
          <input
            ref={controllerField.ref}
            id={id}
            name={controllerField.name}
            type="text"
            value={String(value ?? "")}
            readOnly={disabled}
            placeholder={field.placeholder}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={className}
            onBlur={controllerField.onBlur}
            onChange={(event) => controllerField.onChange(event.target.value)}
          />
        );
      }}
    />
  );
}

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
      {heading ? (
        <h3 className="mt-2 border-b border-[var(--border)] pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)] first:mt-0 md:col-span-2">
          {heading}
        </h3>
      ) : null}
      <div
        className={`flex min-w-0 flex-col gap-1.5 text-sm ${wide ? "md:col-span-2" : ""}`}
      >
        {children}
      </div>
    </>
  );
}

function makeFormDefaults(
  resource: DomainCrudFormResource,
  fields: CrudField[],
  values: Record<string, unknown>,
  clearSelectDefaults: boolean,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = { resource };
  if (values.id != null) defaults.id = values.id;
  for (const field of fields) {
    const value = values[field.name];
    defaults[toFormFieldName(field.name)] =
      clearSelectDefaults && field.type === "select"
        ? ""
        : (value ?? defaultValueForField(field));
  }
  if (resource === "people" && values.userId != null)
    defaults.userId = values.userId;
  if (resource === "songs") {
    defaults.scoreFileName = values.scoreFileName ?? "";
    defaults.scoreMimeType = values.scoreMimeType ?? "";
  }
  if (resource === "presentations") {
    defaults.notifyAll = values.notifyAll ?? true;
  }
  return defaults;
}

function defaultValueForField(field: CrudField): unknown {
  if (field.type === "checkbox") return false;
  if (field.type === "multiselect") return [];
  return "";
}

function toCrudValues(values: unknown): Record<string, unknown> {
  if (!values || typeof values !== "object") return {};
  const source = values as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(source)) {
    if (name === "resource") continue;
    result[name.replaceAll("__", ".")] = value;
  }
  return result;
}

function toFormFieldName(name: string): string {
  return name.replaceAll(".", "__");
}

function getStageStatuses(
  stages: CrudFormStage[],
  form: UseFormReturn<DomainCrudFormValues>,
  maxReachable: number,
): Record<string, "complete" | "warning" | "error"> {
  const statuses: Record<string, "complete" | "warning" | "error"> = {};
  stages.forEach((stage, index) => {
    const hasError = stage.fields.some((name) =>
      Boolean(
        form.getFieldState(
          toFormFieldName(name) as FieldPath<DomainCrudFormValues>,
        ).error,
      ),
    );
    if (hasError) statuses[stage.title] = "error";
    else if (index < maxReachable) {
      statuses[stage.title] = "complete";
    }
  });
  return statuses;
}

function hasNestedError(errors: unknown, path: string): boolean {
  const value = path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, errors);
  return Boolean(value && typeof value === "object" && "message" in value);
}

function optionsForField(
  field: CrudField,
  values: Record<string, unknown>,
  dynamic: EntityFormDynamicChoices,
): CrudOption[] {
  const value = values[field.name];
  const selectedValue = value == null ? "" : String(value);
  let options: CrudOption[];

  if (!field.optionsSource) {
    options = field.options ?? [];
  } else if (field.optionsSource === "instruments") {
    options = (dynamic.instruments ?? []).map((option) => ({
      ...option,
      icon: option.icon ?? "music_note",
    }));
  } else {
    const selfId = values.id == null ? null : String(values.id);
    const selectedPeopleValue = selectedValue || null;
    const people = dynamic.people ?? [];
    const filtered = people.filter((person) => {
      if (person.value === selfId) return false;
      return (
        field.optionsSource !== "people-without-user" ||
        !person.hasUser ||
        person.value === selectedPeopleValue
      );
    });
    options = filtered.map(({ value: id, label }) => ({
      value: id,
      label,
      icon: "person",
    }));
  }

  const emptyOption = options.find((option) => option.value === "");
  options = [
    {
      value: "",
      label: "Selecione…",
      icon: emptyOption?.icon ?? "more_horiz",
    },
    ...options.filter((option) => option.value !== ""),
  ];

  if (
    selectedValue &&
    !options.some((option) => option.value === selectedValue)
  ) {
    const isPerson =
      field.optionsSource === "people" ||
      field.optionsSource === "people-without-user";
    options.push({
      value: selectedValue,
      label: `${isPerson ? "Pessoa" : "Opção"} #${selectedValue}`,
      icon: isPerson ? "person" : "tune",
    });
  }

  return options.map((option) => ({
    ...option,
    icon: option.icon ?? (option.value ? "tune" : "more_horiz"),
  }));
}
