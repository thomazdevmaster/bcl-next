// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IconSelect, type IconSelectOption } from "./IconSelect";

describe("IconSelect keyboard navigation", () => {
  afterEach(() => cleanup());
  it("keeps unknown selected values visible and points aria-controls to the list", async () => {
    const user = userEvent.setup();
    render(
      <IconSelect
        label="Instrumento"
        options={[{ value: "clarinete", label: "Clarinete" }]}
        value="instrumento-removido"
        onChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("combobox", {
      name: "Instrumento: instrumento-removido",
    });
    expect(trigger).toBeTruthy();
    await user.click(trigger);

    const list = screen.getByRole("listbox", { name: "Instrumento" });
    expect(trigger.getAttribute("aria-controls")).toBe(list.id);
    expect(list.id).not.toBe("");
  });

  it("uses Tab to leave the popup at the next form control in a dialog", async () => {
    const user = userEvent.setup();
    render(
      <dialog open>
        <button type="button">Antes</button>
        <IconSelect
          label="Instrumento"
          options={[
            { value: "clarinete", label: "Clarinete" },
            { value: "flauta", label: "Flauta" },
          ]}
          value="clarinete"
          onChange={vi.fn()}
        />
        <input aria-label="Próximo campo" />
        <button type="button">Salvar</button>
      </dialog>,
    );

    await user.click(
      screen.getByRole("combobox", { name: "Instrumento: Clarinete" }),
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: "Clarinete" }),
      );
    });

    await user.tab();

    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Próximo campo" }),
    );
    expect(
      screen
        .getByRole("combobox", { name: "Instrumento: Clarinete" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("keeps search focus and navigates filtered results with the keyboard", async () => {
    const options: IconSelectOption<string>[] = [
      ...Array.from({ length: 16 }, (_, index) => ({
        value: `regular-${index}`,
        label: `Regular ${index}`,
      })),
      { value: "alfa-0", label: "Alfa primeira" },
      { value: "alfa-1", label: "Alfa segunda" },
      { value: "alfa-2", label: "Alfa terceira" },
    ];
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <IconSelect
        label="Instrumento"
        options={options}
        value="regular-2"
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("combobox", { name: "Instrumento: Regular 2" }),
    );
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: "Regular 2" }),
      );
    });
    const search = screen.getByRole("textbox", { name: "Buscar instrumento" });
    search.focus();
    expect(document.activeElement).toBe(search);
    fireEvent.change(search, { target: { value: "alfa" } });
    expect(document.activeElement).toBe(search);

    await waitFor(() => {
      expect(screen.getAllByRole("option")).toHaveLength(3);
    });
    expect(document.activeElement).toBe(search);

    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: "Alfa primeira" }),
      );
    });
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("alfa-0");
  });

  it("opens by keyboard, focuses a virtualized selection, and supports Home and End", async () => {
    const options: IconSelectOption<string>[] = Array.from(
      { length: 30 },
      (_, index) => ({
        value: `instrument-${index}`,
        label: `Instrumento ${index}`,
      }),
    );
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <IconSelect
        label="Instrumento"
        options={options}
        value="instrument-29"
        onChange={onChange}
      />,
    );

    screen
      .getByRole("combobox", { name: "Instrumento: Instrumento 29" })
      .focus();
    await user.keyboard("{ArrowDown}");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: "Instrumento 29" }),
      );
    });

    await user.keyboard("{Home}");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: "Instrumento 0" }),
      );
    });
    await user.keyboard("{End}");
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole("option", { name: "Instrumento 29" }),
      );
    });
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("instrument-29");
  });
});
