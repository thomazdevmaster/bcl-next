import type { ReactNode } from "react";

import type { ValidationState } from "./core/types";

export interface FieldValidationStateInput {
  hasError: boolean;
  untouchedGeneratedValue: boolean;
  emptyOptionalField: boolean;
  hasOptionalMessage: boolean;
  hasBeenValidated: boolean;
  hasValue: boolean;
}

export function resolveFieldValidationState({
  hasError,
  untouchedGeneratedValue,
  emptyOptionalField,
  hasOptionalMessage,
  hasBeenValidated,
  hasValue,
}: FieldValidationStateInput): ValidationState {
  if (hasError) return "invalid";
  if (untouchedGeneratedValue) return "warning";
  if (emptyOptionalField && hasOptionalMessage) return "warning";
  if (hasBeenValidated && hasValue) return "valid";
  return "info";
}

export interface FieldValidationMessageInput {
  errorMessage?: ReactNode;
  state: ValidationState;
  initialValueWarning?: ReactNode;
  optionalMessage?: ReactNode;
  infoMessage?: ReactNode;
  untouchedGeneratedValue?: boolean;
}

export function resolveFieldMessage({
  errorMessage,
  state,
  initialValueWarning,
  optionalMessage,
  infoMessage,
  untouchedGeneratedValue = false,
}: FieldValidationMessageInput): ReactNode {
  if (errorMessage != null) return errorMessage;
  if (state === "warning")
    return untouchedGeneratedValue ? initialValueWarning : optionalMessage;
  if (state === "info") return infoMessage;
  return undefined;
}
