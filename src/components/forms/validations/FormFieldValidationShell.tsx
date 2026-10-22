"use client";

import * as React from "react";
import { FormFieldStatusMessage } from "./FormFieldStatusMessage";
import { controlBase, controlHeight, FIELD_STATUS, helpText, labelText, type FieldProps } from "../core";

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
}: FieldProps) {
  const base = React.useId();
  const controlId = `${base}-control`;
  const labelId = `${base}-label`;
  const descId = description != null && description !== false ? `${base}-desc` : undefined;
  const hasMessage = message != null && message !== false;
  const msgId = hasMessage ? `${base}-msg` : undefined;
  const describedBy = [descId, msgId].filter(Boolean).join(" ") || undefined;
  const status = FIELD_STATUS[state];

  return (
    <div data-slot="styled-field" data-disabled={disabled ? "true" : undefined} className={`group flex w-full min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
      <div>
        <div className="relative mt-2">
          <label
            id={labelId}
            htmlFor={!renderControl || labelForControl ? controlId : undefined}
            data-slot="styled-field-label"
            className={`absolute left-3 top-0 z-10 inline-flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-md bg-[var(--input)] px-1 font-medium leading-4 select-none group-data-[disabled=true]:bg-[var(--input-disabled)] ${labelText[size]} ${status.tone}`}
          >
            {label}
            {required ? (
              <span aria-hidden="true" className="text-[var(--destructive)]">
                *
              </span>
            ) : null}
            {status.icon ? (
              <span
                key={state}
                aria-hidden="true"
                className={`material-icons text-base leading-none transition-[opacity,transform,color] duration-150 ease-out starting:scale-90 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:scale-100 motion-reduce:starting:opacity-100 ${status.iconTone ?? ""}`}
              >
                {status.icon}
              </span>
            ) : null}
          </label>
          {renderControl ? renderControl({
            id: controlId,
            labelId,
            name,
            describedBy,
            invalid: state === "invalid",
            className: `${controlBase} ${controlHeight[size]} ${status.border} ${hasMessage ? "rounded-b-none" : ""}`,
          }) : <input
            ref={inputRef}
            id={controlId}
            name={name}
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
            aria-describedby={describedBy}
            aria-invalid={state === "invalid" ? true : undefined}
            value={value}
            onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
            onBlur={onBlur}
            className={`${controlBase} ${controlHeight[size]} ${status.border} ${hasMessage ? "rounded-b-none" : ""}`}
          />}
          {endAdornment ? (
            <div className="absolute right-0 top-1/2 -translate-y-1/2">{endAdornment}</div>
          ) : null}
        </div>
        <FormFieldStatusMessage id={msgId} state={state} message={message} />
      </div>
      {description != null && description !== false ? (
        <p
          id={descId}
          data-slot="styled-field-description"
          className={`leading-snug text-[var(--muted)] ${helpText[size]}`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
