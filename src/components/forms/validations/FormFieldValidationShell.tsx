"use client";

import * as React from "react";

import {
  FIELD_STATUS,
  type FieldProps,
  controlBase,
  controlHeight,
  helpText,
  labelText,
} from "../core";
import { FormFieldStatusMessage } from "./FormFieldStatusMessage";

export function FormFieldValidationShell({
  className,
  size = "md",
  label,
  description,
  endAdornment,
  placeholder,
  type = "text",
  name,
  autoComplete,
  required,
  disabled,
  readOnly,
  step,
  value,
  onValueChange,
  onBlur,
  inputRef,
  state = "info",
  message,
  inputMode,
  autoCapitalize,
  spellCheck,
  minLength,
  max,
  maxLength,
  renderControl,
  labelForControl = true,
  labelClassName,
}: FieldProps) {
  const base = React.useId();
  const ids = fieldIds(base, description, message);
  const status = FIELD_STATUS[state];

  return (
    <div
      data-slot="styled-field"
      data-disabled={disabled ? "true" : undefined}
      className={`group flex w-full min-w-0 flex-col gap-1.5 ${className ?? ""}`}
    >
      <div>
        <div className="relative mt-2">
          <FieldLabel
            id={ids.labelId}
            controlId={ids.controlId}
            label={label}
            required={required}
            state={state}
            size={size}
            tone={status.tone}
            icon={status.icon ?? null}
            iconTone={status.iconTone}
            renderControl={Boolean(renderControl)}
            labelForControl={labelForControl}
            labelClassName={labelClassName}
          />
          <FieldControl
            controlId={ids.controlId}
            labelId={ids.labelId}
            name={name}
            describedBy={ids.describedBy}
            invalid={state === "invalid"}
            statusIconTone={status.iconTone ?? status.tone}
            className={`${controlBase} ${controlHeight[size]} ${status.border} ${ids.messageId ? "rounded-b-none" : ""}`}
            readOnly={readOnly}
            step={step}
            renderControl={renderControl}
            inputRef={inputRef}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            required={required}
            disabled={disabled}
            minLength={minLength}
            max={max}
            maxLength={maxLength}
            inputMode={inputMode}
            autoCapitalize={autoCapitalize}
            spellCheck={spellCheck}
            value={value}
            onValueChange={onValueChange}
            onBlur={onBlur}
            state={state}
          />
          {endAdornment ? (
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              {endAdornment}
            </div>
          ) : null}
        </div>
        <FormFieldStatusMessage
          id={ids.messageId}
          state={state}
          message={message}
        />
      </div>
      <FieldDescription
        id={ids.descriptionId}
        description={description}
        size={size}
      />
    </div>
  );
}

function fieldIds(
  base: string,
  description: FieldProps["description"],
  message: FieldProps["message"],
) {
  const descriptionId =
    description != null && description !== false ? `${base}-desc` : undefined;
  const messageId =
    message != null && message !== false ? `${base}-msg` : undefined;
  return {
    controlId: `${base}-control`,
    labelId: `${base}-label`,
    descriptionId,
    messageId,
    describedBy:
      [descriptionId, messageId].filter(Boolean).join(" ") || undefined,
  };
}

function FieldLabel({
  id,
  controlId,
  label,
  required,
  state,
  size,
  tone,
  icon,
  iconTone,
  renderControl,
  labelForControl,
  labelClassName,
}: {
  id: string;
  controlId: string;
  label: React.ReactNode;
  required?: boolean;
  state: NonNullable<FieldProps["state"]>;
  size: NonNullable<FieldProps["size"]>;
  tone: string;
  icon: string | null;
  iconTone?: string;
  renderControl: boolean;
  labelForControl?: boolean;
  labelClassName?: string;
}) {
  return (
    <label
      id={id}
      htmlFor={!renderControl || labelForControl ? controlId : undefined}
      data-slot="styled-field-label"
      className={`absolute left-3 top-0 z-10 inline-flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-md bg-[var(--input)] px-1 font-medium leading-4 select-none group-data-[disabled=true]:bg-[var(--input-disabled)] ${labelText[size]} ${tone} ${labelClassName ?? ""}`}
    >
      {label}
      {required ? (
        <span aria-hidden="true" className="text-[var(--destructive)]">
          *
        </span>
      ) : null}
      {icon ? (
        <span
          key={state}
          aria-hidden="true"
          className={`material-icons text-base leading-none transition-[opacity,transform,color] duration-150 ease-out starting:scale-90 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:scale-100 motion-reduce:starting:opacity-100 ${iconTone ?? ""}`}
        >
          {icon}
        </span>
      ) : null}
    </label>
  );
}

function FieldControl({
  controlId,
  labelId,
  name,
  describedBy,
  invalid,
  statusIconTone,
  className,
  readOnly,
  step,
  renderControl,
  inputRef,
  type,
  placeholder,
  autoComplete,
  required,
  disabled,
  minLength,
  max,
  maxLength,
  inputMode,
  autoCapitalize,
  spellCheck,
  value,
  onValueChange,
  onBlur,
  state,
}: {
  controlId: string;
  labelId: string;
  name?: string;
  describedBy?: string;
  invalid: boolean;
  statusIconTone: string;
  className: string;
  readOnly?: boolean;
  step?: FieldProps["step"];
  renderControl: FieldProps["renderControl"];
  inputRef: FieldProps["inputRef"];
  type: NonNullable<FieldProps["type"]>;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
  max?: string;
  maxLength?: number;
  inputMode?: FieldProps["inputMode"];
  autoCapitalize?: string;
  spellCheck?: boolean;
  value?: string;
  onValueChange?: FieldProps["onValueChange"];
  onBlur?: FieldProps["onBlur"];
  state: NonNullable<FieldProps["state"]>;
}) {
  if (renderControl)
    return renderControl({
      id: controlId,
      labelId,
      name,
      describedBy,
      invalid,
      statusIconTone,
      className,
      readOnly,
      step,
    });
  return (
    <input
      ref={inputRef}
      id={controlId}
      name={name}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      step={step}
      minLength={minLength}
      max={max}
      maxLength={maxLength}
      inputMode={inputMode}
      autoCapitalize={autoCapitalize}
      spellCheck={spellCheck}
      aria-describedby={describedBy}
      aria-invalid={state === "invalid" ? true : undefined}
      value={value}
      onChange={
        onValueChange ? (event) => onValueChange(event.target.value) : undefined
      }
      onBlur={onBlur}
      className={className}
    />
  );
}

function FieldDescription({
  id,
  description,
  size,
}: {
  id?: string;
  description: FieldProps["description"];
  size: NonNullable<FieldProps["size"]>;
}) {
  if (description == null || description === false) return null;
  return (
    <p
      id={id}
      data-slot="styled-field-description"
      className={`leading-snug text-[var(--muted)] ${helpText[size]}`}
    >
      {description}
    </p>
  );
}
