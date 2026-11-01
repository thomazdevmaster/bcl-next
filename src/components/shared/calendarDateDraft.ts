import type { CSSProperties } from "react";

interface CalendarDateDraftContext {
  readOnly: boolean;
  minDate: string | null;
  maxDate: string | null;
  formatDateDraft: (digits: string) => string;
  parseDateDraft: (digits: string) => Date | null;
  toISODate: (date: Date) => string;
  isDateOutOfRange: (
    date: string,
    minDate: string | null,
    maxDate: string | null,
  ) => boolean;
  updateDateDraft: (text: string, invalid?: boolean) => void;
  withTime: (date: string) => string;
  onValueChange: (value: string) => void;
  setViewMonth: (date: Date) => void;
  setYearDraft: (year: string) => void;
  setFocusedDate: (date: string) => void;
}

interface CalendarDateDraftBlurContext {
  dateDraft: string;
  dateDraftInvalid: boolean;
  value: string;
  minDate: string | null;
  maxDate: string | null;
  isInsideCalendar: (target: EventTarget | null) => boolean;
  parseDateDraft: (digits: string) => Date | null;
  toISODate: (date: Date) => string;
  isDateOutOfRange: (
    date: string,
    minDate: string | null,
    maxDate: string | null,
  ) => boolean;
  withTime: (date: string) => string;
  formatDate: (value: string) => string;
  onValueChange: (value: string) => void;
  updateDateDraft: (text: string, invalid?: boolean) => void;
  closeCalendar: () => void;
  onBlur?: () => void;
}

export function applyCalendarDateDraftBlur(
  target: EventTarget | null,
  context: CalendarDateDraftBlurContext,
): void {
  if (context.isInsideCalendar(target)) return;
  if (context.dateDraftInvalid || context.dateDraft.length > 0) {
    const digits = context.dateDraft.replace(/\D/g, "");
    const typedDate = context.parseDateDraft(digits);
    const isoDate = typedDate ? context.toISODate(typedDate) : "";
    if (
      typedDate &&
      !context.isDateOutOfRange(isoDate, context.minDate, context.maxDate)
    ) {
      context.onValueChange(context.withTime(isoDate));
    } else if (digits.length === 0) {
      context.onValueChange("");
    }
    context.updateDateDraft(context.formatDate(context.value));
  }
  context.closeCalendar();
  context.onBlur?.();
}

export function applyCalendarDateDraftChange(
  rawValue: string,
  context: CalendarDateDraftContext,
): void {
  if (context.readOnly) return;
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);
  context.updateDateDraft(context.formatDateDraft(digits));
  if (digits.length === 0) {
    context.onValueChange("");
    return;
  }
  if (digits.length < 8) return;

  const typedDate = context.parseDateDraft(digits);
  const isoDate = typedDate ? context.toISODate(typedDate) : "";
  const isInRange =
    Boolean(typedDate) &&
    !context.isDateOutOfRange(isoDate, context.minDate, context.maxDate);
  context.updateDateDraft(context.formatDateDraft(digits), !isInRange);
  if (!isInRange || !typedDate) return;

  context.onValueChange(context.withTime(isoDate));
  context.setViewMonth(
    new Date(typedDate.getFullYear(), typedDate.getMonth(), 1),
  );
  context.setYearDraft(`${typedDate.getFullYear()}`);
  context.setFocusedDate(isoDate);
}

export function updateCalendarTime(
  part: "hour" | "minute",
  rawValue: string,
  value: string,
  onValueChange: (value: string) => void,
): void {
  const [date = ""] = value.split("T");
  if (!date) return;
  const [currentHour = "00", currentMinute = "00"] = (
    value.split("T")[1] || "00:00"
  ).split(":");
  const numericValue = Number.parseInt(rawValue, 10);
  if (Number.isNaN(numericValue)) return;
  const nextHour =
    part === "hour"
      ? `${Math.min(23, numericValue)}`.padStart(2, "0")
      : currentHour;
  const nextMinute =
    part === "minute"
      ? `${Math.min(59, numericValue)}`.padStart(2, "0")
      : currentMinute;
  onValueChange(`${date}T${nextHour}:${nextMinute}`);
}

export function timeValueAtScrollPosition(
  scrollTop: number,
  isMobile: boolean,
  maxValue: number,
): string {
  const rowHeight = isMobile ? 44 : 36;
  const centeredIndex = Math.round(scrollTop / rowHeight);
  return `${Math.max(0, Math.min(maxValue, centeredIndex))}`.padStart(2, "0");
}

interface CalendarDateChoiceContext {
  readOnly: boolean;
  minDate: string | null;
  maxDate: string | null;
  variant: "date" | "date-time";
  toISODate: (date: Date) => string;
  isDateOutOfRange: (
    date: string,
    minDate: string | null,
    maxDate: string | null,
  ) => boolean;
  withTime: (date: string) => string;
  onValueChange: (value: string) => void;
  closeCalendar: (restoreFocus?: boolean) => void;
  onBlur?: () => void;
  setFocusedDate: (date: string) => void;
  setViewMonth: (date: Date) => void;
  setYearDraft: (year: string) => void;
}

export function chooseCalendarDate(
  date: Date,
  context: CalendarDateChoiceContext,
): void {
  if (context.readOnly) return;
  const isoDate = context.toISODate(date);
  if (context.isDateOutOfRange(isoDate, context.minDate, context.maxDate))
    return;
  context.onValueChange(context.withTime(isoDate));
  if (context.variant === "date") {
    context.closeCalendar(true);
    context.onBlur?.();
    return;
  }
  context.setFocusedDate(isoDate);
  context.setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  context.setYearDraft(`${date.getFullYear()}`);
}
interface CalendarPositionInput {
  inputRect: Pick<DOMRect, "left" | "top" | "bottom">;
  dialogRect?: Pick<DOMRect, "left" | "top"> | null;
  viewportWidth: number;
  viewportHeight: number;
  variant: "date" | "date-time";
  calendarHeight: number;
}

export function getCalendarMenuPosition({
  inputRect,
  dialogRect,
  viewportWidth,
  viewportHeight,
  variant,
  calendarHeight,
}: CalendarPositionInput): CSSProperties {
  const margin = 8;
  const width = Math.min(
    variant === "date-time" ? 576 : 344,
    viewportWidth - margin * 2,
  );
  const left = Math.max(
    margin,
    Math.min(inputRect.left, viewportWidth - width - margin),
  );
  const below = viewportHeight - inputRect.bottom - margin;
  const above = inputRect.top - margin;
  const mobileTimeHeight =
    variant === "date-time" && viewportWidth < 640 ? 260 : 0;
  const height = Math.min(
    calendarHeight + mobileTimeHeight,
    viewportHeight - margin * 2,
  );
  const openUpward = below < height && above > below;
  const anchoredTop = openUpward
    ? inputRect.top - height - 4
    : inputRect.bottom + 4;
  const top = Math.max(
    margin,
    Math.min(anchoredTop, viewportHeight - height - margin),
  );
  return {
    position: dialogRect ? "absolute" : "fixed",
    left: dialogRect ? left - dialogRect.left : left,
    top: dialogRect ? top - dialogRect.top : top,
    width,
    height,
  };
}
