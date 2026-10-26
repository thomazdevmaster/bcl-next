"use client";

import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";
import {
  useController,
  useFormContext,
  type FieldPath,
  type FieldPathByValue,
  type FieldValues,
} from "react-hook-form";
import { FormFieldValidationShell } from "./validations/FormFieldValidationShell";

export type FormStageFieldProps<TFieldValues extends FieldValues> = {
  name: FieldPathByValue<TFieldValues, string>;
  label: ReactNode;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  infoMessage?: ReactNode;
  optionalMessage?: ReactNode;
  initialValueWarning?: ReactNode;
  visibilityLabel?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoCapitalize?: string;
  spellCheck?: boolean;
  minLength?: number;
  max?: string;
  maxLength?: number;
  formatValue?: (value: string) => string;
  validateOnChange?: FieldPath<TFieldValues> | FieldPath<TFieldValues>[];
  validateOnMount?: boolean;
  /** Quando "blur", `onEdit` só roda ao sair do campo (menos re-render no pai). */
  syncParentOn?: "change" | "blur";
  onEdit?: () => void;
};

export function FormStageField<TFieldValues extends FieldValues>({
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
  disabled,
  className,
  infoMessage,
  optionalMessage,
  initialValueWarning,
  visibilityLabel,
  inputMode,
  autoCapitalize,
  spellCheck,
  minLength,
  max,
  maxLength,
  formatValue,
  validateOnChange,
  validateOnMount = false,
  syncParentOn = "change",
  onEdit,
}: FormStageFieldProps<TFieldValues>) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [validatedOnMount, setValidatedOnMount] = useState(false);
  const {
    control,
    formState: { isSubmitted },
    trigger,
  } = useFormContext<TFieldValues>();
  const { field, fieldState } = useController({ control, name });
  const value = field.value;
  const hasValue = value.trim().length > 0;
  const isPassword = type === "password";
  const inputType = isPassword && passwordVisible ? "text" : type;
  const untouchedGeneratedValue =
    !fieldState.isDirty && hasValue && initialValueWarning != null;
  const emptyOptionalField = !required && !hasValue;
  useEffect(() => {
    if (!validateOnMount || !hasValue) return;
    void trigger(name).then(() => setValidatedOnMount(true));
  }, [hasValue, name, trigger, validateOnMount]);
  const state = fieldState.error
    ? "invalid"
    : untouchedGeneratedValue
      ? "warning"
      : emptyOptionalField && optionalMessage != null
        ? "warning"
        : (fieldState.isDirty || fieldState.isTouched || isSubmitted || validatedOnMount) && hasValue
          ? "valid"
          : "info";
  const message =
    fieldState.error?.message ??
    (state === "warning"
      ? untouchedGeneratedValue
        ? initialValueWarning
        : optionalMessage
      : state === "info"
        ? infoMessage
        : undefined);

  const handleChange = (rawValue: string) => {
    field.onChange(formatValue ? formatValue(rawValue) : rawValue);
    if (syncParentOn === "change") onEdit?.();
    if (validateOnChange) void trigger(validateOnChange);
  };

  const handleBlur = () => {
    field.onBlur();
    if (syncParentOn === "blur") onEdit?.();
  };

  const visibilityTarget =
    visibilityLabel ??
    (typeof label === "string" ? label.toLowerCase() : "campo");

  return (
    <FormFieldValidationShell
      className={className}
      label={label}
      name={field.name}
      type={inputType}
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
      onValueChange={handleChange}
      onBlur={handleBlur}
      inputRef={field.ref}
      state={state}
      message={message}
      endAdornment={
        isPassword ? (
          <button
            type="button"
            aria-label={`${passwordVisible ? "Ocultar" : "Mostrar"} ${visibilityTarget}`}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="inline-flex size-11 items-center justify-center rounded-r-xl text-[var(--muted)] transition-[color,transform] duration-150 ease-out hover:text-[var(--foreground)] active:scale-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <span
              key={passwordVisible ? "visible" : "hidden"}
              aria-hidden="true"
              className="material-icons text-xl transition-[opacity,transform] duration-150 ease-out starting:scale-90 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:scale-100 motion-reduce:starting:opacity-100"
            >
              {passwordVisible ? "visibility_off" : "visibility"}
            </span>
          </button>
        ) : undefined
      }
    />
  );
}
