import type { ReactNode } from "react";
import type { StripTone, ValidationState } from "../core";
import { FormFieldStateStrip } from "./FormFieldStateStrip";

type FormFieldStatusMessageProps = {
  id?: string;
  state: ValidationState;
  message?: ReactNode;
};

export function FormFieldStatusMessage({ id, state, message }: FormFieldStatusMessageProps) {
  if (id == null || message == null || message === false) return null;

  const toneByState: Record<ValidationState, StripTone> = {
    invalid: "error",
    valid: "success",
    warning: "warning",
    info: "info",
  };

  return (
    <FormFieldStateStrip key={state} id={id} tone={toneByState[state]}>
      {message}
    </FormFieldStateStrip>
  );
}
