import { describe, expect, it, vi } from "vitest";

import {
  applyCalendarDateDraftBlur,
  applyCalendarDateDraftChange,
  chooseCalendarDate,
  getCalendarMenuPosition,
  updateCalendarTime,
} from "./calendarDateDraft";

const context = () => ({
  readOnly: false,
  minDate: null,
  maxDate: null,
  formatDateDraft: (digits: string) =>
    digits.length > 4
      ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits,
  parseDateDraft: (digits: string) => {
    if (digits.length !== 8) return null;
    const date = new Date(Number(digits.slice(4)), Number(digits.slice(2, 4)) - 1, Number(digits.slice(0, 2)));
    return date.getDate() === Number(digits.slice(0, 2)) ? date : null;
  },
  toISODate: (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
  isDateOutOfRange: (date: string, min: string | null, max: string | null) =>
    Boolean((min && date < min) || (max && date > max)),
  updateDateDraft: vi.fn(),
  withTime: (date: string) => `${date}T09:30`,
  onValueChange: vi.fn(),
  setViewMonth: vi.fn(),
  setYearDraft: vi.fn(),
  setFocusedDate: vi.fn(),
});

describe("applyCalendarDateDraftChange", () => {
  it("formats partial input and clears the value when emptied", () => {
    const handlers = context();
    applyCalendarDateDraftChange("1502", handlers);
    expect(handlers.updateDateDraft).toHaveBeenCalledWith("1502");
    applyCalendarDateDraftChange("", handlers);
    expect(handlers.onValueChange).toHaveBeenCalledWith("");
  });

  it("updates the calendar for a valid in-range date", () => {
    const handlers = context();
    applyCalendarDateDraftChange("15022026", handlers);
    expect(handlers.onValueChange).toHaveBeenCalledWith("2026-02-15T09:30");
    expect(handlers.setFocusedDate).toHaveBeenCalledWith("2026-02-15");
    expect(handlers.setYearDraft).toHaveBeenCalledWith("2026");
  });

  it("marks invalid or out-of-range dates and ignores read-only input", () => {
    const handlers = context();
    applyCalendarDateDraftChange("31022026", handlers);
    expect(handlers.updateDateDraft).toHaveBeenLastCalledWith(
      "31/02/2026",
      true,
    );
    applyCalendarDateDraftChange("15022026", {
      ...handlers,
      readOnly: false,
      minDate: "2026-03-01",
    });
    expect(handlers.updateDateDraft).toHaveBeenLastCalledWith(
      "15/02/2026",
      true,
    );
    const callCount = handlers.updateDateDraft.mock.calls.length;
    applyCalendarDateDraftChange("15022026", { ...handlers, readOnly: true });
    expect(handlers.updateDateDraft).toHaveBeenCalledTimes(callCount);
  });
});

describe("applyCalendarDateDraftBlur", () => {
  it("keeps focus interactions inside the calendar and commits a valid draft", () => {
    const handlers = context();
    const insideTarget = new EventTarget();
    const blur = {
      ...handlers,
      dateDraft: "15/02/2026",
      dateDraftInvalid: false,
      value: "",
      formatDate: (value: string) => value ? `formatted:${value}` : "",
      isInsideCalendar: (target: EventTarget | null) => target === insideTarget,
      closeCalendar: vi.fn(),
      onBlur: vi.fn(),
    };
    applyCalendarDateDraftBlur(insideTarget, blur);
    expect(blur.closeCalendar).not.toHaveBeenCalled();
    applyCalendarDateDraftBlur(null, blur);
    expect(blur.onValueChange).toHaveBeenCalledWith("2026-02-15T09:30");
    expect(blur.closeCalendar).toHaveBeenCalledOnce();
    expect(blur.onBlur).toHaveBeenCalledOnce();
  });

  it("clears an emptied draft and restores the displayed value for invalid input", () => {
    const handlers = context();
    const blur = {
      ...handlers,
      dateDraft: "",
      dateDraftInvalid: true,
      value: "",
      formatDate: (value: string) => value ? `formatted:${value}` : "",
      isInsideCalendar: () => false,
      closeCalendar: vi.fn(),
      onBlur: vi.fn(),
    };
    applyCalendarDateDraftBlur(null, blur);
    expect(blur.onValueChange).toHaveBeenCalledWith("");

    const invalidBlur = {
      ...blur,
      dateDraft: "31/02/2026",
      dateDraftInvalid: true,
      value: "2026-02-15T09:30",
      formatDate: (value: string) => `formatted:${value}`,
      updateDateDraft: vi.fn(),
      onValueChange: vi.fn(),
    };
    applyCalendarDateDraftBlur(null, invalidBlur);
    expect(invalidBlur.onValueChange).not.toHaveBeenCalled();
    expect(invalidBlur.updateDateDraft).toHaveBeenCalledWith(
      "formatted:2026-02-15T09:30",
    );
  });
});

describe("updateCalendarTime", () => {
  it("clamps hours and minutes while preserving the other time part", () => {
    const onValueChange = vi.fn();
    updateCalendarTime("hour", "28", "2026-02-15T09:30", onValueChange);
    updateCalendarTime("minute", "88", "2026-02-15T09:30", onValueChange);
    expect(onValueChange).toHaveBeenNthCalledWith(1, "2026-02-15T23:30");
    expect(onValueChange).toHaveBeenNthCalledWith(2, "2026-02-15T09:59");
  });

  it("ignores missing dates and nonnumeric time input", () => {
    const onValueChange = vi.fn();
    updateCalendarTime("hour", "12", "", onValueChange);
    updateCalendarTime("minute", "bad", "2026-02-15T09:30", onValueChange);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("chooseCalendarDate", () => {
  it("commits an in-range date and closes a date-only calendar", () => {
    const onValueChange = vi.fn();
    const closeCalendar = vi.fn();
    const onBlur = vi.fn();
    chooseCalendarDate(new Date(2026, 1, 15), {
      readOnly: false,
      minDate: null,
      maxDate: null,
      variant: "date",
      toISODate: context().toISODate,
      isDateOutOfRange: context().isDateOutOfRange,
      withTime: (date) => date,
      onValueChange,
      closeCalendar,
      onBlur,
      setFocusedDate: vi.fn(),
      setViewMonth: vi.fn(),
      setYearDraft: vi.fn(),
    });
    expect(onValueChange).toHaveBeenCalledWith("2026-02-15");
    expect(closeCalendar).toHaveBeenCalledWith(true);
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it("updates the visible month for date-time and ignores unavailable dates", () => {
    const onValueChange = vi.fn();
    const setFocusedDate = vi.fn();
    const options = {
      readOnly: false,
      minDate: null,
      maxDate: null,
      variant: "date-time" as const,
      toISODate: context().toISODate,
      isDateOutOfRange: context().isDateOutOfRange,
      withTime: (date: string) => `${date}T09:30`,
      onValueChange,
      closeCalendar: vi.fn(),
      onBlur: vi.fn(),
      setFocusedDate,
      setViewMonth: vi.fn(),
      setYearDraft: vi.fn(),
    };
    chooseCalendarDate(new Date(2026, 1, 15), options);
    expect(setFocusedDate).toHaveBeenCalledWith("2026-02-15");
    chooseCalendarDate(new Date(2026, 1, 15), {
      ...options,
      minDate: "2026-03-01",
    });
    expect(onValueChange).toHaveBeenCalledOnce();
  });
});

describe("getCalendarMenuPosition", () => {
  it("anchors below the input and keeps the menu in the viewport", () => {
    expect(
      getCalendarMenuPosition({
        inputRect: { left: 700, top: 100, bottom: 130 },
        viewportWidth: 800,
        viewportHeight: 600,
        variant: "date",
        calendarHeight: 400,
      }),
    ).toEqual({
      position: "fixed",
      left: 448,
      top: 134,
      width: 344,
      height: 400,
    });
  });

  it("uses dialog coordinates and reserves mobile space for time controls", () => {
    expect(
      getCalendarMenuPosition({
        inputRect: { left: 30, top: 300, bottom: 330 },
        dialogRect: { left: 10, top: 20 },
        viewportWidth: 500,
        viewportHeight: 600,
        variant: "date-time",
        calendarHeight: 400,
      }),
    ).toMatchObject({
      position: "absolute",
      left: -2,
      top: -12,
      width: 484,
      height: 584,
    });
  });
});
