"use client";

import { Controller, FormProvider, type UseFormReturn } from "react-hook-form";

import { FormStageActions } from "@/components/forms/FormStageActions";
import { FormStageBlock } from "@/components/forms/FormStageBlock";
import { FormStageField } from "@/components/forms/FormStageField";
import { FormView } from "@/components/forms/core/FormView";
import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { IconCheckbox } from "@/components/shared/IconCheckbox";
import { IconSelect } from "@/components/shared/IconSelect";
import type { IconSelectOption } from "@/components/shared/IconSelect";
import type { EventTypeFormValues } from "@/domains/presentations/schemas/event-type.schema";
import type { PresentationType } from "@/domains/presentations/types";

const iconOptions: IconSelectOption<string>[] = [
  { value: "", label: "Sem ícone", icon: "do_not_disturb_on" },
  { value: "event", label: "Evento", icon: "event" },
  { value: "music_note", label: "Música", icon: "music_note" },
  { value: "groups", label: "Grupo", icon: "groups" },
  { value: "meeting_room", label: "Reunião", icon: "meeting_room" },
  { value: "celebration", label: "Celebração", icon: "celebration" },
  { value: "campaign", label: "Aviso", icon: "campaign" },
  { value: "school", label: "Formação", icon: "school" },
];

interface PresentationTypeFormProps {
  form: UseFormReturn<EventTypeFormValues>;
  editingType: PresentationType | null;
  title: string;
  saving: boolean;
  error: string | null;
  onSubmit: (values: EventTypeFormValues) => Promise<void>;
  onCancel: () => void;
}

export function PresentationTypeForm({
  form,
  editingType,
  title,
  saving,
  error,
  onSubmit,
  onCancel,
}: PresentationTypeFormProps) {
  return (
    <FormProvider {...form}>
      <FormView
        eyebrow="Agenda"
        title={title}
        description="Defina o nome, o ícone e o padrão de visibilidade do tipo."
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="!p-4 sm:!p-6"
        formClassName="space-y-5"
      >
        {error ? (
          <p
            className="rounded-xl bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <FormStageBlock title="Dados do tipo" surface="plain">
          <FormStageField<EventTypeFormValues>
            name="name"
            label="Nome do tipo de evento"
            type="text"
            required
            autoComplete="off"
            maxLength={80}
          />
          <IconField form={form} />
          <BooleanField
            form={form}
            name="isPublicByDefault"
            label="Público por padrão"
            icon="public"
            sectionLabel="Visibilidade padrão"
          />
          {editingType && !editingType.isSystem ? (
            <BooleanField
              form={form}
              name="isActive"
              label="Tipo ativo"
              icon="check_circle"
              sectionLabel="Estado do tipo"
            />
          ) : null}
        </FormStageBlock>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-outline-primary min-h-12 px-4"
            disabled={saving}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <FormStageActions
            active={0}
            total={1}
            busy={saving}
            onBack={onCancel}
            onNext={() => undefined}
            onSubmit={() => void form.handleSubmit(onSubmit)()}
            submitLabel="Salvar tipo"
            pendingLabel="Salvando…"
            className="!pt-0"
          />
        </div>
      </FormView>
    </FormProvider>
  );
}

function IconField({ form }: { form: UseFormReturn<EventTypeFormValues> }) {
  return (
    <Controller
      control={form.control}
      name="icon"
      render={({ field, fieldState }) => (
        <FormFieldValidationShell
          label="Ícone do tipo (opcional)"
          name={field.name}
          description="Escolha um ícone Material ou deixe sem ícone."
          state={
            fieldState.invalid
              ? "invalid"
              : fieldState.isTouched
                ? "valid"
                : "info"
          }
          message={fieldState.error?.message}
          labelForControl={false}
          renderControl={({ id, describedBy, invalid, className }) => (
            <IconSelect
              id={id}
              label="Ícone do tipo"
              options={iconOptions}
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              onTriggerRef={field.ref}
              describedBy={describedBy}
              invalid={invalid}
              triggerClassName={`${className} !pr-3`}
            />
          )}
        />
      )}
    />
  );
}

function BooleanField({
  form,
  name,
  label,
  icon,
  sectionLabel,
}: {
  form: UseFormReturn<EventTypeFormValues>;
  name: "isPublicByDefault" | "isActive";
  label: string;
  icon: string;
  sectionLabel: string;
}) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldValidationShell
          label={sectionLabel}
          name={field.name}
          state={
            fieldState.invalid
              ? "invalid"
              : fieldState.isTouched
                ? "valid"
                : "info"
          }
          message={fieldState.error?.message}
          labelForControl={false}
          labelClassName="sr-only"
          renderControl={({ id, labelId, describedBy, invalid }) => (
            <div
              id={id}
              role="group"
              aria-labelledby={labelId}
              aria-describedby={describedBy}
            >
              <IconCheckbox
                name={field.name}
                inputRef={field.ref}
                label={label}
                icon={icon}
                checked={field.value}
                onBlur={field.onBlur}
                onChange={field.onChange}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
              />
            </div>
          )}
        />
      )}
    />
  );
}
