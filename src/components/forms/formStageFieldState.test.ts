import { describe, expect, it } from "vitest";

import {
  resolveFieldMessage,
  resolveFieldValidationState,
} from "./formStageFieldState";

describe("form stage field state", () => {
  it("prioritizes errors and generated-value warnings", () => {
    expect(
      resolveFieldValidationState({
        hasError: true,
        untouchedGeneratedValue: true,
        emptyOptionalField: false,
        hasOptionalMessage: true,
        hasBeenValidated: true,
        hasValue: true,
      }),
    ).toBe("invalid");
    expect(
      resolveFieldValidationState({
        hasError: false,
        untouchedGeneratedValue: true,
        emptyOptionalField: false,
        hasOptionalMessage: false,
        hasBeenValidated: true,
        hasValue: true,
      }),
    ).toBe("warning");
  });

  it("distinguishes optional, valid, and untouched fields", () => {
    const base = {
      hasError: false,
      untouchedGeneratedValue: false,
      hasOptionalMessage: true,
      hasBeenValidated: true,
    };
    expect(
      resolveFieldValidationState({
        ...base,
        emptyOptionalField: true,
        hasValue: false,
      }),
    ).toBe("warning");
    expect(
      resolveFieldValidationState({
        ...base,
        emptyOptionalField: false,
        hasValue: true,
      }),
    ).toBe("valid");
    expect(
      resolveFieldValidationState({
        ...base,
        emptyOptionalField: false,
        hasBeenValidated: false,
        hasValue: false,
      }),
    ).toBe("info");
  });

  it("chooses the message associated with the resolved state", () => {
    expect(
      resolveFieldMessage({
        errorMessage: "Erro",
        state: "invalid",
        initialValueWarning: "Gerado",
        optionalMessage: "Opcional",
        infoMessage: "Ajuda",
      }),
    ).toBe("Erro");
    expect(
      resolveFieldMessage({
        state: "warning",
        initialValueWarning: "Gerado",
        optionalMessage: "Opcional",
        untouchedGeneratedValue: true,
      }),
    ).toBe("Gerado");
    expect(resolveFieldMessage({ state: "info", infoMessage: "Ajuda" })).toBe(
      "Ajuda",
    );
    expect(resolveFieldMessage({ state: "valid" })).toBeUndefined();
  });
});
