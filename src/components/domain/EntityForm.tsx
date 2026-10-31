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
  type FieldErrors,
  type FieldPath,
  type FieldPathByValue,
  FormProvider,
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
  CrudOptionSource,
} from "@/domains/crudConfig";
import type { DomainCrudFormResource } from "@/domains/crudConfig";
import {
  type DomainCrudFormValues,
  domainCrudFormSchema,
} from "@/domains/crudFormSchema";
import { formatPhoneNumber } from "@/domains/people/formatting";
import { youtubeEmbedUrl, youtubeWatchUrl } from "@/domains/songs/youtube";
import { prepareMusicXmlUpload } from "./prepareMusicXmlUpload";

export interface EntityFormDynamicChoices {
  people: Array<CrudOption & { hasUser: boolean }> | null;
  instruments: CrudOption[] | null;
  presentationTypes: Array<
    CrudOption & {
      isPublicByDefault: boolean;
      isActive: boolean;
      isSystem: boolean;
    }
  > | null;
  presentationTypesLoading?: boolean;
  presentationTypesError?: string | null;
  songs?: CrudOption[] | null;
  songsLoading?: boolean;
  songsError?: string | null;
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
  onRetryPresentationTypes?: () => void;
  onRetrySongs?: () => void;
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
  onRetryPresentationTypes,
  onRetrySongs,
  onEdit,
}: EntityFormProps) {
  const form = useForm<DomainCrudFormValues>({
    resolver: zodResolver(domainCrudFormSchema),
    defaultValues: makeFormDefaults(
      resource,
      fields,
      values,
    ) as DefaultValues<DomainCrudFormValues>,
    shouldUnregister: false,
    mode: editing ? "onChange" : "onTouched",
  });
  const formErrors = form.formState.errors;
  const watched = useWatch({ control: form.control });
  const flatValues = toCrudValues(watched);
  const [activeStage, setActiveStage] = useState(0);
  const [validatedOnOpen, setValidatedOnOpen] = useState(false);
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
  const stageStatuses = getStageStatuses(
    stages,
    formErrors,
    maxReachable,
    validatedOnOpen,
  );

  useEffect(() => {
    if (!editing || readOnly) return;
    let active = true;
    void form.trigger().then(() => {
      if (active) setValidatedOnOpen(true);
    });
    return () => {
      active = false;
    };
  }, [editing, form, readOnly]);

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
                      resource={resource}
                      field={field}
                      values={flatValues}
                      dynamicChoices={dynamicChoices}
                      validatedOnOpen={validatedOnOpen}
                      readOnly={readOnly}
                      editing={editing}
                      onRetryPresentationTypes={onRetryPresentationTypes}
                      onRetrySongs={onRetrySongs}
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

function usesFormStageField(field: CrudField): boolean {
  return !["checkbox", "select", "multiselect", "textarea", "xml"].includes(
    field.type ?? "",
  );
}

export function simpleFieldPresentation(
  resource: DomainCrudFormResource,
  field: CrudField,
) {
  const isEventDate = field.name === "startsAt" || field.name === "endsAt";
  return {
    calendarVariant:
      resource === "presentations" && isEventDate ? "date-time" : undefined,
    optionalMessage: field.required ? undefined : "Opcional",
    inputMode:
      field.type === "tel"
        ? "tel"
        : field.type === "number"
          ? "decimal"
          : undefined,
    autoComplete: field.type === "password" ? "new-password" : undefined,
    step: field.type === "number" ? "0.01" : undefined,
  } as const;
}

export function formatCrudFieldValue(
  field: CrudField,
  value: string,
  values: Record<string, unknown>,
): string {
  if (field.type === "tel") return formatPhoneNumber(value);
  return field.format ? field.format(value, values) : value;
}

function CrudFormField({
  resource,
  field,
  values,
  dynamicChoices,
  validatedOnOpen,
  readOnly,
  editing,
  onRetryPresentationTypes,
  onRetrySongs,
}: {
  resource: DomainCrudFormResource;
  field: CrudField;
  values: Record<string, unknown>;
  dynamicChoices: EntityFormDynamicChoices;
  validatedOnOpen: boolean;
  readOnly: boolean;
  editing: boolean;
  onRetryPresentationTypes?: () => void;
  onRetrySongs?: () => void;
}) {
  const formName = toFormFieldName(field.name);
  const fieldPath = formName as FieldPath<DomainCrudFormValues>;
  const disabled = readOnly || (editing && Boolean(field.lockOnEdit));
  const presentation = simpleFieldPresentation(resource, field);
  if (usesFormStageField(field)) {
    return (
      <FormStageField<DomainCrudFormValues>
        name={fieldPath as FieldPathByValue<DomainCrudFormValues, string>}
        label={field.label}
        type={field.type ?? "text"}
        calendarVariant={presentation.calendarVariant}
        placeholder={field.placeholder}
        required={field.required ?? false}
        validatedOnOpen={validatedOnOpen}
        readOnly={disabled}
        infoMessage={field.helpText}
        optionalMessage={presentation.optionalMessage}
        inputMode={presentation.inputMode}
        autoComplete={presentation.autoComplete}
        step={presentation.step}
        formatValue={(value) => formatCrudFieldValue(field, value, values)}
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
      validatedOnOpen={validatedOnOpen}
      readOnly={readOnly}
      editing={editing}
      onRetryPresentationTypes={onRetryPresentationTypes}
      onRetrySongs={onRetrySongs}
    />
  );
}

function ControlledCrudField({
  field,
  fieldPath,
  values,
  dynamicChoices,
  disabled,
  validatedOnOpen,
  readOnly,
  editing,
  onRetryPresentationTypes,
  onRetrySongs,
}: {
  field: CrudField;
  fieldPath: FieldPath<DomainCrudFormValues>;
  values: Record<string, unknown>;
  dynamicChoices: EntityFormDynamicChoices;
  disabled: boolean;
  validatedOnOpen: boolean;
  readOnly: boolean;
  editing: boolean;
  onRetryPresentationTypes?: () => void;
  onRetrySongs?: () => void;
}) {
  const { control, clearErrors, getFieldState, setError, setValue } =
    useFormContext<DomainCrudFormValues>();
  const { field: controllerField, fieldState } = useController({
    control,
    name: fieldPath,
  });
  const value = controllerField.value;
  const message = fieldState.error?.message;
  const state = fieldState.invalid
    ? "invalid"
    : fieldState.isTouched || fieldState.isDirty || validatedOnOpen
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
    const result = await prepareMusicXmlUpload(file);
    if (!result.ok) {
      input.value = "";
      setError(fieldPath, { type: "validate", message: result.message });
      return;
    }
    setFileFieldValue("scoreFile", result.dataUrl);
    setFileFieldValue("scoreFileName", result.fileName);
    setFileFieldValue("scoreMimeType", result.mimeType);
    for (const name of [
        "title",
        "composer",
        "arranger",
        "genre",
        "key",
    ] as const) {
      if (result.metadata[name]) setFileFieldValue(name, result.metadata[name]);
    }
    if (result.metadata.durationSeconds != null) {
      setFileFieldValue("durationSeconds", String(result.metadata.durationSeconds));
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
          const handleChange = (nextValue: string) => {
            controllerField.onChange(nextValue);
            if (
              field.name === "eventTypeId" &&
              !editing &&
              !getFieldState("isPublic").isTouched
            ) {
              const selectedType = dynamicChoices.presentationTypes?.find(
                (item) => item.value === nextValue,
              );
              if (selectedType) {
                setValue("isPublic", selectedType.isPublicByDefault, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }
          };
          const isPresentationType = field.name === "eventTypeId";
          return (
            <div className="min-w-0 space-y-2">
              <IconSelect
                id={id}
                label={field.label}
                options={options}
                value={String(value ?? "")}
                disabled={
                  disabled ||
                  (isPresentationType &&
                    (dynamicChoices.presentationTypesLoading ||
                      Boolean(dynamicChoices.presentationTypesError)))
                }
                required={fieldRequired}
                invalid={invalid}
                describedBy={describedBy}
                onTriggerRef={controllerField.ref}
                triggerClassName={`${className} !pr-3`}
                onBlur={controllerField.onBlur}
                onChange={handleChange}
              />
              {isPresentationType && dynamicChoices.presentationTypesLoading ? (
                <p className="text-sm text-[var(--muted)]" role="status">
                  Carregando tipos de evento…
                </p>
              ) : null}
              {isPresentationType && dynamicChoices.presentationTypesError ? (
                <div
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--destructive)]/40 p-3 text-sm text-[var(--destructive)]"
                  role="alert"
                >
                  <span>{dynamicChoices.presentationTypesError}</span>
                  {!readOnly && onRetryPresentationTypes ? (
                    <button
                      type="button"
                      className="min-h-11 rounded-lg px-3 font-semibold underline underline-offset-2"
                      onClick={onRetryPresentationTypes}
                    >
                      Tentar novamente
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
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
          if (field.optionsSource === "songs") {
            return (
              <div className="min-w-0 space-y-2">
                <IconSelect
                  id={id}
                  label={field.label}
                  options={options}
                  multiple
                  value={selectedValues}
                  allowEmptySelection
                  selectedSummary={(selected) =>
                    selected.length === 0
                      ? "Selecione músicas…"
                      : `${selected.length} ${selected.length === 1 ? "música selecionada" : "músicas selecionadas"}`
                  }
                  disabled={
                    disabled ||
                    dynamicChoices.songsLoading === true ||
                    Boolean(dynamicChoices.songsError)
                  }
                  describedBy={describedBy}
                  onBlur={controllerField.onBlur}
                  onChange={controllerField.onChange}
                  triggerClassName={`${className} !pr-3`}
                />
                {dynamicChoices.songsLoading ? (
                  <p className="text-sm text-[var(--muted)]" role="status">
                    Carregando músicas…
                  </p>
                ) : null}
                {dynamicChoices.songsError ? (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--destructive)]/40 p-3 text-sm text-[var(--destructive)]"
                    role="alert"
                  >
                    <span>{dynamicChoices.songsError}</span>
                    {!readOnly && onRetrySongs ? (
                      <button
                        type="button"
                        className="min-h-11 rounded-lg px-3 font-semibold underline underline-offset-2"
                        onClick={onRetrySongs}
                      >
                        Tentar novamente
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          }
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

export function makeFormDefaults(
  resource: DomainCrudFormResource,
  fields: CrudField[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = { resource };
  if (values.id != null) defaults.id = values.id;
  addFieldDefaults(defaults, fields, values);
  if (resource === "people" && values.userId != null)
    defaults.userId = values.userId;
  if (resource === "songs") addSongDefaults(defaults, values);
  if (resource === "presentations") addPresentationDefaults(defaults, values);
  return defaults;
}

function addFieldDefaults(
  defaults: Record<string, unknown>,
  fields: CrudField[],
  values: Record<string, unknown>,
): void {
  for (const field of fields) {
    defaults[toFormFieldName(field.name)] =
      values[field.name] ?? defaultValueForField(field);
  }
}

function addSongDefaults(
  defaults: Record<string, unknown>,
  values: Record<string, unknown>,
): void {
  defaults.scoreFileName = values.scoreFileName ?? "";
  defaults.scoreMimeType = values.scoreMimeType ?? "";
}

function addPresentationDefaults(
  defaults: Record<string, unknown>,
  values: Record<string, unknown>,
): void {
  defaults.notifyAll = values.notifyAll ?? true;
  const eventType = asRecord(values.eventType);
  defaults.eventTypeName = eventType?.name ?? "";
  defaults.eventTypeIcon = eventType?.icon ?? "event";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export function defaultValueForField(field: CrudField): unknown {
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
  errors: FieldErrors<DomainCrudFormValues>,
  maxReachable: number,
  validatedOnOpen: boolean,
): Record<string, "complete" | "warning" | "error"> {
  const statuses: Record<string, "complete" | "warning" | "error"> = {};
  stages.forEach((stage, index) => {
    const hasError = stage.fields.some((name) =>
      hasNestedError(errors, toFormFieldName(name)),
    );
    if (hasError) statuses[stage.title] = "error";
    else if (validatedOnOpen || index < maxReachable) {
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

export function optionsForField(
  field: CrudField,
  values: Record<string, unknown>,
  dynamic: EntityFormDynamicChoices,
): CrudOption[] {
  const value = values[field.name];
  const selectedValue =
    value == null || Array.isArray(value) ? "" : String(value);
  const options = optionsForSource(
    field,
    values,
    dynamic,
    value,
    selectedValue,
  );
  const withEmptyChoice = addEmptyChoice(field, options);
  const withSelection = addSelectedOption(
    field,
    withEmptyChoice,
    selectedValue,
  );
  return addFallbackIcons(withSelection);
}

function addEmptyChoice(field: CrudField, options: CrudOption[]): CrudOption[] {
  if (field.type === "multiselect" && field.optionsSource === "songs") {
    return options;
  }
  const emptyOption = options.find((option) => option.value === "");
  return [
    {
      value: "",
      label: "Selecione…",
      icon: emptyOption?.icon ?? "more_horiz",
    },
    ...options.filter((option) => option.value !== ""),
  ];
}

function addSelectedOption(
  field: CrudField,
  options: CrudOption[],
  selectedValue: string,
): CrudOption[] {
  if (
    !selectedValue ||
    options.some((option) => option.value === selectedValue)
  ) {
    return options;
  }
  const isPerson =
    field.optionsSource === "people" ||
    field.optionsSource === "people-without-user";
  return [
    ...options,
    {
      value: selectedValue,
      label: `${isPerson ? "Pessoa" : "Opção"} #${selectedValue}`,
      icon: isPerson ? "person" : "tune",
    },
  ];
}

function addFallbackIcons(options: CrudOption[]): CrudOption[] {
  return options.map((option) => ({
    ...option,
    icon: option.icon ?? (option.value ? "tune" : "more_horiz"),
  }));
}

function optionsForSource(
  field: CrudField,
  values: Record<string, unknown>,
  dynamic: EntityFormDynamicChoices,
  value: unknown,
  selectedValue: string,
): CrudOption[] {
  const source = field.optionsSource;
  if (!source) return field.options ?? [];
  return sourceOptionBuilders[source](
    field,
    values,
    dynamic,
    value,
    selectedValue,
  );
}

type SourceOptionBuilder = (
  field: CrudField,
  values: Record<string, unknown>,
  dynamic: EntityFormDynamicChoices,
  value: unknown,
  selectedValue: string,
) => CrudOption[];

const sourceOptionBuilders: Record<CrudOptionSource, SourceOptionBuilder> = {
  "presentation-types": (_field, values, dynamic, _value, selectedValue) =>
    presentationTypeOptions(values, dynamic, selectedValue),
  instruments: (_field, _values, dynamic) =>
    addDefaultIcon(dynamic.instruments ?? [], "music_note"),
  songs: (_field, _values, dynamic, value) =>
    songOptions(dynamic.songs ?? [], value),
  people: (field, values, dynamic, _value, selectedValue) =>
    peopleOptions(field, values, dynamic, selectedValue),
  "people-without-user": (field, values, dynamic, _value, selectedValue) =>
    peopleOptions(field, values, dynamic, selectedValue),
};

function presentationTypeOptions(
  values: Record<string, unknown>,
  dynamic: EntityFormDynamicChoices,
  selectedValue: string,
): CrudOption[] {
  const types = (dynamic.presentationTypes ?? [])
    .filter((type) => type.isActive || type.value === selectedValue)
    .map((type) => ({ ...type, icon: type.icon ?? "event" }));
  if (selectedValue !== "__snapshot__") return types;
  return [
    ...types,
    {
      value: "__snapshot__",
      label: `${String(values.eventTypeName || "Tipo removido")} (removido)`,
      icon: String(values.eventTypeIcon || "event"),
    },
  ];
}

function addDefaultIcon(options: CrudOption[], icon: string): CrudOption[] {
  return options.map((option) => ({ ...option, icon: option.icon ?? icon }));
}

function songOptions(options: CrudOption[], value: unknown): CrudOption[] {
  const available = addDefaultIcon(options, "library_music");
  const selectedIds = Array.isArray(value) ? value.map(String) : [];
  const unavailable = selectedIds
    .filter((id) => !available.some((option) => option.value === id))
    .map((id) => ({
      value: id,
      label: `Música #${id} (indisponível)`,
      icon: "library_music",
    }));
  return [...available, ...unavailable];
}

function peopleOptions(
  field: CrudField,
  values: Record<string, unknown>,
  dynamic: EntityFormDynamicChoices,
  selectedValue: string,
): CrudOption[] {
  const selfId = values.id == null ? null : String(values.id);
  return (dynamic.people ?? [])
    .filter((person) => person.value !== selfId)
    .filter(
      (person) =>
        field.optionsSource !== "people-without-user" ||
        !person.hasUser ||
        person.value === (selectedValue || null),
    )
    .map(({ value, label }) => ({ value, label, icon: "person" }));
}
