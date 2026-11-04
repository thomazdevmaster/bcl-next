// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormFieldValidationShell } from "./FormFieldValidationShell";

describe("FormFieldValidationShell", () => {
  afterEach(cleanup);

  it("connects input labels, descriptions, validation and value changes", () => {
    const onValueChange = vi.fn();
    render(
      <FormFieldValidationShell
        label="Nome"
        name="name"
        description="Nome completo"
        required
        state="invalid"
        message="Campo obrigatório"
        value=""
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByRole("textbox", { name: /Nome/ });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("-desc");
    expect(input.getAttribute("aria-describedby")).toContain("-msg");
    fireEvent.change(input, { target: { value: "Ana" } });
    expect(onValueChange).toHaveBeenCalledWith("Ana");
    expect(screen.getByText("Campo obrigatório")).toBeTruthy();
    expect(screen.getByText("Nome completo")).toBeTruthy();
  });

  it("passes field state and accessibility props to custom controls", () => {
    const renderControl = vi.fn(({ id, className, describedBy }) => (
      <button id={id} className={className} aria-describedby={describedBy}>
        Abrir seletor
      </button>
    ));
    render(
      <FormFieldValidationShell
        label="Instrumento"
        name="instrument"
        state="valid"
        renderControl={renderControl}
      />,
    );

    expect(screen.getByText("Abrir seletor")).toBeTruthy();
    expect(renderControl).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "instrument",
        invalid: false,
      }),
    );
  });
});
