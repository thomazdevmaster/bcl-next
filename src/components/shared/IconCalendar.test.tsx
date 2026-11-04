// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormFieldValidationShell } from "../forms/validations/FormFieldValidationShell";
import { IconCalendar } from "./IconCalendar";

const baseProps = {
  id: "event-date",
  labelId: "event-date-label",
  invalid: false,
  className: "control",
  label: "Início",
  onValueChange: vi.fn(),
};

describe("IconCalendar variants", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps date-only as the default", () => {
    render(
      <IconCalendar
        {...baseProps}
        value="2026-10-31"
        onValueChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Início: horário")).toBeNull();
  });

  it("formats typed day, month, and year and emits an ISO date", () => {
    const onValueChange = vi.fn();
    render(
      <IconCalendar {...baseProps} value="" onValueChange={onValueChange} />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "31102026" } });

    expect(onValueChange).toHaveBeenCalledWith("2026-10-31");
    expect(input).toHaveProperty("value", "31/10/2026");
  });

  it("moves focus across days and months with calendar keyboard shortcuts", () => {
    render(
      <IconCalendar
        {...baseProps}
        value="2026-10-31"
        onValueChange={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Abrir calendário de início" }),
    );
    const picker = screen.getByRole("dialog", { name: "Calendário de início" });
    const selectedDate = picker.querySelector<HTMLButtonElement>(
      '[data-date="2026-10-31"]',
    );
    if (!selectedDate) throw new Error("Selected date is missing");

    fireEvent.keyDown(selectedDate, { key: "ArrowRight" });
    const nextDay = picker.querySelector<HTMLButtonElement>(
      '[data-date="2026-11-01"]',
    );
    if (!nextDay) throw new Error("Next month day is missing");
    expect(nextDay.tabIndex).toBe(0);

    fireEvent.keyDown(nextDay, { key: "PageDown" });
    const nextMonth = picker.querySelector<HTMLButtonElement>(
      '[data-date="2026-12-01"]',
    );
    if (!nextMonth) throw new Error("Next month is missing");
    expect(nextMonth.tabIndex).toBe(0);

    fireEvent.keyDown(nextMonth, { key: "PageUp" });
    expect(
      picker.querySelector<HTMLButtonElement>('[data-date="2026-11-01"]')
        ?.tabIndex,
    ).toBe(0);
  });

  it("keeps keyboard focus inside the configured date range", () => {
    render(
      <IconCalendar
        {...baseProps}
        value="2026-11-02"
        min="2026-11-02"
        max="2026-11-02"
        onValueChange={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Abrir calendário de início" }),
    );
    const picker = screen.getByRole("dialog", { name: "Calendário de início" });
    const onlyDate = picker.querySelector<HTMLButtonElement>(
      '[data-date="2026-11-02"]',
    );
    if (!onlyDate) throw new Error("Bounded date is missing");

    fireEvent.keyDown(onlyDate, { key: "ArrowLeft" });
    expect(onlyDate.tabIndex).toBe(0);
    fireEvent.keyDown(onlyDate, { key: "ArrowRight" });
    expect(onlyDate.tabIndex).toBe(0);
  });

  it("applies the validation state to the calendar icon and keeps the message", () => {
    render(
      <FormFieldValidationShell
        label="Data"
        name="date"
        type="date"
        value=""
        state="invalid"
        message="Informe uma data válida."
        renderControl={(control) => (
          <IconCalendar
            {...control}
            iconToneClassName={control.statusIconTone}
            value=""
            onValueChange={vi.fn()}
            label="Data"
          />
        )}
      />,
    );

    const calendarButton = screen.getByRole("button", {
      name: "Abrir calendário de data",
    });
    expect(calendarButton.querySelector("span")?.className).toContain(
      "text-[var(--destructive)]",
    );
    expect(screen.getByText("Informe uma data válida.")).toBeTruthy();
  });

  it("updates the time inside the calendar popover while preserving the date", () => {
    const onValueChange = vi.fn();

    function StatefulDateTimeCalendar() {
      const [value, setValue] = useState("2026-10-31T18:15");
      return (
        <IconCalendar
          {...baseProps}
          value={value}
          variant="date-time"
          onValueChange={(nextValue) => {
            setValue(nextValue);
            onValueChange(nextValue);
          }}
        />
      );
    }

    render(<StatefulDateTimeCalendar />);

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir calendário de início" }),
    );
    const hours = screen.getByRole("listbox", { name: "Hora de início" });
    const minutes = screen.getByRole("listbox", { name: "Minuto de início" });
    fireEvent.keyDown(hours, { key: "ArrowDown" });
    expect(onValueChange).toHaveBeenLastCalledWith("2026-10-31T19:15");
    fireEvent.keyDown(hours, { key: "ArrowUp" });
    expect(onValueChange).toHaveBeenLastCalledWith("2026-10-31T18:15");
    const callsBeforeIgnoredKey = onValueChange.mock.calls.length;
    fireEvent.keyDown(hours, { key: "Enter" });
    expect(onValueChange).toHaveBeenCalledTimes(callsBeforeIgnoredKey);
    fireEvent.click(within(hours).getByRole("option", { name: "19" }));
    fireEvent.click(within(minutes).getByRole("option", { name: "45" }));

    expect(onValueChange).toHaveBeenCalledWith("2026-10-31T19:45");
  });

  it("shows the selected date without separately emphasizing today", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T15:00:00.000Z"));
    render(
      <IconCalendar
        {...baseProps}
        value="2026-10-25T09:15"
        variant="date-time"
        onValueChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir calendário de início" }),
    );
    const today = screen.getByRole("gridcell", { current: "date" });

    expect(today.className).not.toContain("ring-1");
    expect(
      screen
        .getByRole("gridcell", { name: /25 de outubro de 2026/i })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.queryByRole("textbox", { name: /digitar hora/i })).toBeNull();
  });

  it("presents a compact, centered wheel below the calendar on mobile", () => {
    render(
      <IconCalendar
        {...baseProps}
        value="2026-10-31T18:15"
        variant="date-time"
        onValueChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir calendário de início" }),
    );
    const picker = screen.getByRole("dialog", {
      name: "Calendário de início",
    });
    const datePanel = picker.querySelector('[data-picker-panel="date"]');
    const timePanel = picker.querySelector('[data-picker-panel="time"]');
    const wheel = screen.getByRole("listbox", { name: "Hora de início" });
    if (!datePanel || !timePanel) {
      throw new Error("Date and time panels should both be rendered");
    }

    expect(
      datePanel.compareDocumentPosition(timePanel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(wheel.className).toContain("snap-y");
    expect(wheel.className).toContain("h-[132px]");
    expect(
      timePanel?.querySelector('[data-wheel-center-overlay="true"]'),
    ).toBeTruthy();
    expect(timePanel?.parentElement?.className).toContain(
      "min-[640px]:grid-cols-[minmax(0,1fr)_14rem]",
    );
    expect(timePanel?.querySelectorAll("p.whitespace-nowrap")).toHaveLength(2);
    expect(picker.style.width).toBe("576px");
  });

  it("keeps six desktop time values visible and aligns the completion action", () => {
    render(
      <IconCalendar
        {...baseProps}
        value="2026-10-31T18:15"
        variant="date-time"
        onValueChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir calendário de início" }),
    );

    const picker = screen.getByRole("dialog", {
      name: "Calendário de início",
    });
    const hourWheel = screen.getByRole("listbox", { name: "Hora de início" });
    expect(picker.className).toContain("overflow-y-auto");
    expect(picker.className).toContain("min-[640px]:overflow-hidden");
    const minuteWheel = screen.getByRole("listbox", {
      name: "Minuto de início",
    });
    expect(hourWheel.className).toContain("min-[640px]:h-[216px]");
    expect(minuteWheel.className).toContain("min-[640px]:h-[216px]");
    expect(
      screen.getByRole("button", { name: "Concluir" }).className,
    ).toContain("min-[640px]:mt-auto");
  });

  it("changes the selected value when the mobile wheel is scrolled", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    const onValueChange = vi.fn();

    function StatefulDateTimeCalendar() {
      const [value, setValue] = useState("2026-10-31T03:15");
      return (
        <IconCalendar
          {...baseProps}
          value={value}
          variant="date-time"
          onValueChange={(nextValue) => {
            setValue(nextValue);
            onValueChange(nextValue);
          }}
        />
      );
    }

    try {
      render(<StatefulDateTimeCalendar />);
      fireEvent.click(
        screen.getByRole("button", { name: "Abrir calendário de início" }),
      );
      const hours = screen.getByRole("listbox", { name: "Hora de início" });
      fireEvent.scroll(hours, { target: { scrollTop: 11 * 44 } });

      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith("2026-10-31T11:15");
      });
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalWidth,
      });
    }
  });

  it("keeps desktop wheel endpoints selected after scrolling", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
    const onValueChange = vi.fn();

    function StatefulDateTimeCalendar() {
      const [value, setValue] = useState("2026-10-31T18:15");
      return (
        <IconCalendar
          {...baseProps}
          value={value}
          variant="date-time"
          onValueChange={(nextValue) => {
            setValue(nextValue);
            onValueChange(nextValue);
          }}
        />
      );
    }

    try {
      render(<StatefulDateTimeCalendar />);
      fireEvent.click(
        screen.getByRole("button", { name: "Abrir calendário de início" }),
      );
      const minutes = screen.getByRole("listbox", {
        name: "Minuto de início",
      });
      expect(minutes.className).toContain("min-[640px]:py-[90px]");

      fireEvent.scroll(minutes, { target: { scrollTop: 0 } });
      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith("2026-10-31T18:00");
      });

      fireEvent.scroll(minutes, { target: { scrollTop: 59 * 36 } });
      await waitFor(() => {
        expect(onValueChange).toHaveBeenLastCalledWith("2026-10-31T18:59");
      });
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: originalWidth,
      });
    }
  });

  it("keeps a single field and opens date and time controls in the same popover", () => {
    render(
      <IconCalendar
        {...baseProps}
        value="2026-10-31T18:15"
        variant="date-time"
        onValueChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("listbox", { name: "Hora de início" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Abrir calendário de início" }),
    );

    const picker = screen.getByRole("dialog", {
      name: "Calendário de início",
    });
    const datePanel = picker.querySelector('[data-picker-panel="date"]');
    const timePanel = picker.querySelector('[data-picker-panel="time"]');
    if (!datePanel || !timePanel) {
      throw new Error("Date and time panels should both be rendered");
    }
    expect(datePanel.parentElement).toBe(timePanel.parentElement);
    expect(
      datePanel.compareDocumentPosition(timePanel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      picker.contains(screen.getByRole("listbox", { name: "Hora de início" })),
    ).toBe(true);
    expect(
      picker.contains(
        screen.getByRole("listbox", { name: "Minuto de início" }),
      ),
    ).toBe(true);
  });

  it("keeps the popover open after choosing a date so time can be selected", () => {
    const onValueChange = vi.fn();
    render(
      <IconCalendar
        {...baseProps}
        value=""
        variant="date-time"
        onValueChange={onValueChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir calendário de início" }),
    );
    const picker = screen.getByRole("dialog", {
      name: "Calendário de início",
    });
    const dateOption = picker.querySelector<HTMLButtonElement>("[data-date]");
    if (!dateOption?.dataset.date) {
      throw new Error("The calendar should render a selectable date");
    }

    fireEvent.click(dateOption);

    expect(onValueChange).toHaveBeenCalledWith(
      `${dateOption.dataset.date}T00:00`,
    );
    expect(
      screen.getByRole("dialog", { name: "Calendário de início" }),
    ).toBeTruthy();
  });
});
