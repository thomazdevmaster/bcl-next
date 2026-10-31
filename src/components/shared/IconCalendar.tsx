"use client";

import {
  type CSSProperties,
  type FocusEvent,
  type Ref,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  applyCalendarDateDraftBlur,
  applyCalendarDateDraftChange,
  chooseCalendarDate,
  getCalendarMenuPosition,
  updateCalendarTime,
} from "./calendarDateDraft";

export type CalendarControlProps = {
  id: string;
  labelId: string;
  name?: string;
  describedBy?: string;
  invalid: boolean;
  className: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  label: string;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  variant?: "date" | "date-time";
  iconToneClassName?: string;
};

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const CALENDAR_HEIGHT = 380;
const DESKTOP_TIME_WHEEL_HEIGHT = 216;

function timeWheelDirection(key: string): number {
  if (key === "ArrowDown" || key === "PageDown") return 1;
  if (key === "ArrowUp" || key === "PageUp") return -1;
  return 0;
}

function timeValueAtScrollPosition(
  scrollTop: number,
  isMobile: boolean,
  maxValue: number,
): string {
  const rowHeight = isMobile ? 44 : 36;
  const centeredIndex = isMobile
    ? Math.round(scrollTop / rowHeight)
    : Math.round(
        (scrollTop + (DESKTOP_TIME_WHEEL_HEIGHT - rowHeight) / 2) / rowHeight,
      );
  return `${Math.max(0, Math.min(maxValue, centeredIndex))}`.padStart(2, "0");
}

function TimeWheelOptions({
  id,
  value,
  maxValue,
  disabled,
  onSelect,
}: {
  id: string;
  value: string;
  maxValue: number;
  disabled: boolean;
  onSelect: (value: number) => void;
}) {
  return Array.from({ length: maxValue + 1 }, (_, item) => {
    const optionValue = `${item}`.padStart(2, "0");
    const isSelected = optionValue === value;
    return (
      <div
        key={optionValue}
        id={`${id}-${optionValue}`}
        role="option"
        aria-selected={isSelected}
        onClick={() => !disabled && onSelect(item)}
        className={`flex h-11 min-h-11 shrink-0 snap-center cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-colors min-[640px]:h-9 min-[640px]:min-h-9 min-[640px]:snap-align-none ${isSelected ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--foreground)] hover:bg-[var(--card)]"} ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        {optionValue}
      </div>
    );
  });
}

function useScrollToSelectedTime(
  listRef: React.RefObject<HTMLDivElement | null>,
  id: string,
  value: string,
  open: boolean,
) {
  useEffect(() => {
    const list = listRef.current;
    if (!open || !list) return;
    const animationFrame = requestAnimationFrame(() => {
      list.querySelector<HTMLElement>(`#${id}-${value}`)?.scrollIntoView?.({
        block: "center",
      });
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [id, listRef, open, value]);
}

function useClearTimeWheelTimer(
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [timerRef],
  );
}

function selectTimeValue(
  list: HTMLDivElement | null,
  id: string,
  maxValue: number,
  nextValue: number,
  onChange: (value: string) => void,
) {
  const bounded = Math.max(0, Math.min(maxValue, nextValue));
  const nextText = `${bounded}`.padStart(2, "0");
  list?.querySelector<HTMLElement>(`#${id}-${nextText}`)?.scrollIntoView?.({
    block: "center",
  });
  onChange(nextText);
}

function scheduleTimeWheelChange(
  list: HTMLDivElement,
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  maxValue: number,
  onChange: (value: string) => void,
) {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(() => {
    onChange(
      timeValueAtScrollPosition(
        list.scrollTop,
        window.innerWidth < 640,
        maxValue,
      ),
    );
  }, 100);
}

function nextCalendarDate(date: Date, key: string): Date | null {
  const dayOffsets: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };
  if (key in dayOffsets) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + dayOffsets[key]);
    return nextDate;
  }
  if (key !== "PageUp" && key !== "PageDown") return null;
  return new Date(
    date.getFullYear(),
    date.getMonth() + (key === "PageUp" ? -1 : 1),
    date.getDate(),
  );
}

function boundedCalendarDate(
  date: Date,
  minDate: string | null,
  maxDate: string | null,
): Date | null {
  const isoDate = toISODate(date);
  const boundedISO =
    minDate && isoDate < minDate
      ? minDate
      : maxDate && isoDate > maxDate
        ? maxDate
        : isoDate;
  return parseDate(boundedISO);
}

function CalendarDateGrid({
  dates,
  viewMonth,
  todayISO,
  selectedDate,
  focusedDate,
  minDate,
  maxDate,
  onChooseDate,
  onNavigateDate,
}: {
  dates: Date[];
  viewMonth: Date;
  todayISO: string;
  selectedDate: string;
  focusedDate: string;
  minDate: string | null;
  maxDate: string | null;
  onChooseDate: (date: Date) => void;
  onNavigateDate: (date: Date) => void;
}) {
  return (
    <div
      className="grid grid-cols-7"
      role="grid"
      aria-label={monthLabel(viewMonth)}
    >
      {dates.map((date) => (
        <CalendarDateCell
          key={toISODate(date)}
          date={date}
          currentMonth={viewMonth.getMonth()}
          todayISO={todayISO}
          selectedDate={selectedDate}
          focusedDate={focusedDate}
          minDate={minDate}
          maxDate={maxDate}
          onChooseDate={onChooseDate}
          onNavigateDate={onNavigateDate}
        />
      ))}
    </div>
  );
}

function isDateOutOfRange(
  isoDate: string,
  minDate: string | null,
  maxDate: string | null,
): boolean {
  return Boolean((minDate && isoDate < minDate) || (maxDate && isoDate > maxDate));
}

function calendarDateClassName(
  date: Date,
  currentMonth: number,
  isSelected: boolean,
  isToday: boolean,
  selectedDate: string,
): string {
  const selectionClass = isSelected
    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
    : "text-[var(--foreground)] hover:bg-[var(--card-secondary)]";
  const monthClass =
    date.getMonth() !== currentMonth ? "text-[var(--muted)]" : "";
  const todayClass =
    isToday && !selectedDate && !isSelected
      ? "ring-1 ring-inset ring-[var(--ring)]"
      : "";
  return `mx-auto inline-flex size-11 items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-30 ${selectionClass} ${monthClass} ${todayClass}`;
}

function CalendarDateCell({
  date,
  currentMonth,
  todayISO,
  selectedDate,
  focusedDate,
  minDate,
  maxDate,
  onChooseDate,
  onNavigateDate,
}: {
  date: Date;
  currentMonth: number;
  todayISO: string;
  selectedDate: string;
  focusedDate: string;
  minDate: string | null;
  maxDate: string | null;
  onChooseDate: (date: Date) => void;
  onNavigateDate: (date: Date) => void;
}) {
  const isoDate = toISODate(date);
  const isSelected = isoDate === selectedDate;
  const isToday = isoDate === todayISO;
  const outOfRange = isDateOutOfRange(isoDate, minDate, maxDate);
  return (
    <button
      type="button"
      role="gridcell"
      aria-label={new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "full",
      }).format(date)}
      aria-selected={isSelected}
      aria-current={isToday ? "date" : undefined}
      data-date={isoDate}
      tabIndex={isoDate === focusedDate ? 0 : -1}
      disabled={outOfRange}
      onKeyDown={(event) => {
        const nextDate = nextCalendarDate(date, event.key);
        if (!nextDate) return;
        event.preventDefault();
        const boundedDate = boundedCalendarDate(nextDate, minDate, maxDate);
        if (boundedDate) onNavigateDate(boundedDate);
      }}
      onClick={() => onChooseDate(date)}
      className={calendarDateClassName(
        date,
        currentMonth,
        isSelected,
        isToday,
        selectedDate,
      )}
    >
      {date.getDate()}
    </button>
  );
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2})?$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
    ? null
    : date;
}

function todayInBrasilia(): Date {
  const parts = new Map(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value]),
  );
  return (
    parseDate(
      `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`,
    ) ?? new Date()
  );
}

function toISODate(date: Date): string {
  const year = `${date.getFullYear()}`.padStart(4, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return `${label.charAt(0).toLocaleUpperCase("pt-BR")}${label.slice(1)}`;
}

function formatDate(value: string): string {
  const date = parseDate(value);
  if (!date) return "";
  return `${`${date.getDate()}`.padStart(2, "0")}/${`${date.getMonth() + 1}`.padStart(2, "0")}/${date.getFullYear()}`;
}

function datePart(value: string): string {
  return value.slice(0, 10);
}

function timePart(value: string): string {
  const match = /T(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? "";
}

function formatDateDraft(digits: string): string {
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}/${month}`;
  return `${day}/${month}/${year}`;
}

function parseDateDraft(digits: string): Date | null {
  if (digits.length !== 8) return null;
  return parseDate(
    `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`,
  );
}

function TimeWheel({
  id,
  label,
  value,
  maxValue,
  disabled,
  open,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  maxValue: number;
  disabled: boolean;
  open: boolean;
  onChange: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedValue = Number(value);
  useScrollToSelectedTime(listRef, id, value, open);
  useClearTimeWheelTimer(scrollTimerRef);
  const selectValue = (nextValue: number) =>
    selectTimeValue(listRef.current, id, maxValue, nextValue, onChange);

  return (
    <div className="min-w-0">
      <p className="mb-1 whitespace-nowrap text-center text-xs font-medium text-[var(--muted)]">
        {label}
      </p>
      <div className="relative">
        <div
          ref={listRef}
          role="listbox"
          aria-label={label}
          aria-activedescendant={`${id}-${value}`}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          onScroll={(event) => {
            if (disabled) return;
            scheduleTimeWheelChange(
              event.currentTarget,
              scrollTimerRef,
              maxValue,
              onChange,
            );
          }}
          onKeyDown={(event) => {
            const direction = timeWheelDirection(event.key);
            if (direction === 0) return;
            event.preventDefault();
            selectValue(selectedValue + direction);
          }}
          className="h-[132px] min-h-0 snap-y snap-mandatory touch-pan-y overflow-y-auto overscroll-contain rounded-lg border border-[var(--border)] bg-[var(--card-secondary)] py-[44px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] aria-disabled:opacity-50 min-[640px]:h-[216px] min-[640px]:snap-none min-[640px]:py-0"
        >
          <TimeWheelOptions
            id={id}
            value={value}
            maxValue={maxValue}
            disabled={disabled}
            onSelect={selectValue}
          />
        </div>
        <div
          aria-hidden="true"
          data-wheel-center-overlay="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-11 -translate-y-1/2 rounded-md border-y border-[var(--border)] bg-gradient-to-b from-[var(--card-secondary)]/70 via-transparent to-[var(--card-secondary)]/70 min-[640px]:hidden"
        />
      </div>
    </div>
  );
}

export function IconCalendar({
  id,
  labelId,
  name,
  describedBy,
  invalid,
  className,
  value,
  onValueChange,
  onBlur,
  inputRef,
  label,
  placeholder = "dd/mm/aaaa",
  min,
  max,
  disabled,
  readOnly,
  required,
  variant = "date",
  iconToneClassName,
}: CalendarControlProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const calendarId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [focusedDate, setFocusedDate] = useState(
    () => value || toISODate(todayInBrasilia()),
  );
  const [viewMonth, setViewMonth] = useState(() => {
    const selected = parseDate(value);
    const initial = selected ?? todayInBrasilia();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const [yearDraft, setYearDraft] = useState(
    () => `${viewMonth.getFullYear()}`,
  );
  const [dateDraftState, setDateDraftState] = useState(() => ({
    sourceValue: value,
    text: formatDate(value),
    invalid: false,
  }));
  const dateDraft =
    dateDraftState.sourceValue === value
      ? dateDraftState.text
      : formatDate(value);
  const inputValue =
    variant === "date-time"
      ? [formatDate(value), timePart(value)].filter(Boolean).join(" · ")
      : dateDraft;
  const dateDraftInvalid =
    dateDraftState.sourceValue === value && dateDraftState.invalid;
  const updateDateDraft = (text: string, invalidDraft = false) =>
    setDateDraftState({ sourceValue: value, text, invalid: invalidDraft });
  const withTime = (date: string) => {
    if (!date || variant === "date") return date;
    return `${date}T${timePart(value) || "00:00"}`;
  };
  const updateTime = (part: "hour" | "minute", rawValue: string) =>
    updateCalendarTime(part, rawValue, value, onValueChange);
  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const gridStart = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    1 - firstDay.getDay(),
  );
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarCellCount =
    Math.ceil((firstDay.getDay() + daysInMonth) / 7) * 7;
  const dates = Array.from(
    { length: calendarCellCount },
    (_, index) =>
      new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      ),
  );
  const todayISO = toISODate(todayInBrasilia());
  const calendarHeight = showMonthYearPicker
    ? CALENDAR_HEIGHT
    : 18 + 48 + 28 + (calendarCellCount / 7) * 44;
  const minDate = min ? datePart(min) : null;
  const maxDate = max ? datePart(max) : null;
  const minMonth = minDate ? parseDate(minDate) : null;
  const maxMonth = maxDate ? parseDate(maxDate) : null;
  const previousMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() - 1,
    1,
  );
  const nextMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    1,
  );
  const cannotGoBack = Boolean(
    minMonth &&
    previousMonth < new Date(minMonth.getFullYear(), minMonth.getMonth(), 1),
  );
  const cannotGoForward = Boolean(
    maxMonth &&
    nextMonth > new Date(maxMonth.getFullYear(), maxMonth.getMonth(), 1),
  );

  const closeCalendar = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) rootRef.current?.querySelector("input")?.focus();
  };

  const openCalendar = () => {
    if (disabled || readOnly) return;
    const selected = parseDate(value);
    const initial = selected ?? todayInBrasilia();
    setFocusedDate(toISODate(initial));
    setViewMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
    setYearDraft(`${initial.getFullYear()}`);
    setShowMonthYearPicker(false);
    setPortalContainer(rootRef.current?.closest("dialog") ?? document.body);
    setIsOpen(true);
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const input = rootRef.current?.querySelector("input");
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const dialog =
        portalContainer instanceof HTMLDialogElement ? portalContainer : null;
      const dialogRect = dialog?.getBoundingClientRect();
      setMenuStyle(
        getCalendarMenuPosition({
          inputRect: rect,
          dialogRect,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          variant,
          calendarHeight,
        }),
      );
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [calendarHeight, isOpen, portalContainer, variant]);

  useEffect(() => {
    if (!isOpen || !menuStyle) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-date="${focusedDate}"]:not(:disabled)`,
      )
      ?.focus();
  }, [focusedDate, isOpen, menuStyle]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (rootRef.current?.contains(target) || menuRef.current?.contains(target))
      )
        return;
      closeCalendar();
      onBlur?.();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isOpen, onBlur]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) =>
    applyCalendarDateDraftBlur(event.relatedTarget, {
      dateDraft,
      dateDraftInvalid,
      value,
      minDate,
      maxDate,
      isInsideCalendar: (target) =>
        target instanceof Node &&
        Boolean(
          rootRef.current?.contains(target) || menuRef.current?.contains(target),
        ),
      parseDateDraft,
      toISODate,
      isDateOutOfRange,
      withTime,
      formatDate,
      onValueChange,
      updateDateDraft,
      closeCalendar,
      onBlur,
    });

  const handleDateDraftChange = (rawValue: string) =>
    applyCalendarDateDraftChange(rawValue, {
      readOnly: Boolean(readOnly),
      minDate,
      maxDate,
      formatDateDraft,
      parseDateDraft,
      toISODate,
      isDateOutOfRange,
      updateDateDraft,
      withTime,
      onValueChange,
      setViewMonth,
      setYearDraft,
      setFocusedDate,
    });

  const chooseDate = (date: Date) =>
    chooseCalendarDate(date, {
      readOnly: Boolean(readOnly),
      minDate,
      maxDate,
      variant,
      toISODate,
      isDateOutOfRange,
      withTime,
      onValueChange,
      closeCalendar,
      onBlur,
      setFocusedDate,
      setViewMonth,
      setYearDraft,
    });

  return (
    <div ref={rootRef} className="min-w-0" onBlur={handleBlur}>
      <div
        className={
          variant === "date-time"
            ? "grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem]"
            : "relative"
        }
      >
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          autoComplete="off"
          inputMode={variant === "date-time" ? undefined : "numeric"}
          value={inputValue}
          placeholder={
            variant === "date-time" ? "dd/mm/aaaa · hh:mm" : placeholder
          }
          disabled={disabled}
          readOnly={readOnly || variant === "date-time"}
          required={required}
          aria-labelledby={labelId}
          aria-describedby={
            [describedBy, dateDraftInvalid ? `${id}-date-error` : undefined]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={invalid || dateDraftInvalid || undefined}
          role="combobox"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={calendarId}
          onClick={() => {
            if (variant === "date-time") openCalendar();
          }}
          onChange={(event) => handleDateDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (readOnly) return;
            if (event.key === "Escape" && isOpen) {
              event.preventDefault();
              closeCalendar(true);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              openCalendar();
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (variant === "date-time") {
                openCalendar();
                return;
              }
              const parsedDate = parseDateDraft(dateDraft.replace(/\D/g, ""));
              const isoDate = parsedDate ? toISODate(parsedDate) : "";
              const isInRange =
                Boolean(parsedDate) &&
                !isDateOutOfRange(isoDate, minDate, maxDate);
              if (parsedDate && isInRange) {
                onValueChange(withTime(isoDate));
                closeCalendar(true);
                onBlur?.();
              } else if (parsedDate) {
                updateDateDraft(dateDraft, true);
              } else {
                openCalendar();
              }
            }
          }}
          className={
            variant === "date-time"
              ? `${className} min-w-0 rounded-r-none border-r-0 pr-2`
              : `${className} pr-11`
          }
        />
        <button
          type="button"
          aria-label={`${isOpen ? "Fechar" : "Abrir"} calendário de ${label.toLocaleLowerCase("pt-BR")}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={calendarId}
          disabled={disabled || readOnly}
          onClick={() => (isOpen ? closeCalendar() : openCalendar())}
          className={
            variant === "date-time"
              ? "inline-flex size-11 shrink-0 items-center justify-center rounded-r-xl border-y border-r border-[var(--border)] bg-[var(--input)] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:bg-[var(--input-disabled)]"
              : "absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-r-xl text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed"
          }
        >
          <span
            className={`material-icons text-lg ${iconToneClassName ?? ""}`}
            aria-hidden="true"
          >
            calendar_month
          </span>
        </button>
      </div>
      {dateDraftInvalid ? (
        <p
          id={`${id}-date-error`}
          role="alert"
          className="mt-1 text-xs text-[var(--destructive)]"
        >
          Digite uma data válida no formato dd/mm/aaaa e dentro dos limites
          permitidos.
        </p>
      ) : null}
      {isOpen && menuStyle && portalContainer
        ? createPortal(
            <div
              ref={menuRef}
              id={calendarId}
              role="dialog"
              aria-label={`Calendário de ${label.toLocaleLowerCase("pt-BR")}`}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeCalendar(true);
                }
              }}
              style={menuStyle}
              className={`z-[100] rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] shadow-[var(--shadow-soft)] ${variant === "date-time" ? "overflow-y-auto min-[640px]:overflow-hidden" : "overflow-hidden"}`}
            >
              <div
                className={
                  variant === "date-time"
                    ? "grid min-w-0 grid-cols-1 gap-2 min-[640px]:min-h-full min-[640px]:grid-cols-[minmax(0,1fr)_14rem]"
                    : "min-w-0"
                }
              >
                <div data-picker-panel="date" className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      aria-label="Mês anterior"
                      disabled={cannotGoBack}
                      onClick={() => {
                        setViewMonth(previousMonth);
                        setYearDraft(`${previousMonth.getFullYear()}`);
                      }}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--card-secondary)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="material-icons" aria-hidden="true">
                        chevron_left
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label="Escolher mês e ano"
                      aria-expanded={showMonthYearPicker}
                      onClick={() =>
                        setShowMonthYearPicker((current) => !current)
                      }
                      className="min-h-11 min-w-0 flex-1 rounded-lg px-2 text-center text-sm font-semibold transition-colors hover:bg-[var(--card-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                    >
                      <span aria-live="polite">{monthLabel(viewMonth)}</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Próximo mês"
                      disabled={cannotGoForward}
                      onClick={() => {
                        setViewMonth(nextMonth);
                        setYearDraft(`${nextMonth.getFullYear()}`);
                      }}
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--card-secondary)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="material-icons" aria-hidden="true">
                        chevron_right
                      </span>
                    </button>
                  </div>
                  {showMonthYearPicker ? (
                    <div className="space-y-3">
                      <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--card-secondary)] px-3 text-sm font-semibold">
                        <span>Ano</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={minMonth?.getFullYear() ?? 1}
                          max={maxMonth?.getFullYear() ?? 9999}
                          aria-label="Ano do calendário"
                          value={yearDraft}
                          onChange={(event) => {
                            const nextYear = event.target.value;
                            setYearDraft(nextYear);
                            const parsedYear = Number(nextYear);
                            if (parsedYear >= 1 && parsedYear <= 9999) {
                              setViewMonth(
                                new Date(parsedYear, viewMonth.getMonth(), 1),
                              );
                              setYearDraft(`${parsedYear}`);
                            }
                          }}
                          className="min-h-10 w-24 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 text-right text-sm font-semibold text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        />
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {Array.from({ length: 12 }, (_, month) => {
                          const monthDate = new Date(
                            viewMonth.getFullYear(),
                            month,
                            1,
                          );
                          const monthISO = toISODate(monthDate);
                          const monthLastDay = toISODate(
                            new Date(viewMonth.getFullYear(), month + 1, 0),
                          );
                          const unavailable = Boolean(
                            (minDate && monthLastDay < minDate) ||
                            (maxDate && monthISO > maxDate),
                          );
                          const selectedMonth = month === viewMonth.getMonth();
                          return (
                            <button
                              key={month}
                              type="button"
                              disabled={unavailable}
                              aria-pressed={selectedMonth}
                              onClick={() => {
                                setFocusedDate(monthISO);
                                setViewMonth(monthDate);
                                setYearDraft(`${monthDate.getFullYear()}`);
                                setShowMonthYearPicker(false);
                              }}
                              className={`min-h-11 rounded-lg px-2 text-sm font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-40 ${selectedMonth ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--foreground)] hover:bg-[var(--card-secondary)]"}`}
                            >
                              {new Intl.DateTimeFormat("pt-BR", {
                                month: "long",
                              }).format(monthDate)}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMonthYearPicker(false)}
                        className="min-h-11 w-full rounded-lg px-3 text-left text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--card-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
                      >
                        Voltar ao calendário
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-7 text-center text-xs font-semibold capitalize text-[var(--muted)]">
                        {WEEKDAYS.map((weekday) => (
                          <span
                            key={weekday}
                            className="flex h-7 items-center justify-center"
                          >
                            {weekday}
                          </span>
                        ))}
                      </div>
                      <CalendarDateGrid
                        dates={dates}
                        viewMonth={viewMonth}
                        todayISO={todayISO}
                        selectedDate={datePart(value)}
                        focusedDate={focusedDate}
                        minDate={minDate}
                        maxDate={maxDate}
                        onChooseDate={chooseDate}
                        onNavigateDate={(date) => {
                          const isoDate = toISODate(date);
                          setFocusedDate(isoDate);
                          setViewMonth(
                            new Date(date.getFullYear(), date.getMonth(), 1),
                          );
                          setYearDraft(`${date.getFullYear()}`);
                        }}
                      />
                    </>
                  )}
                </div>
                {variant === "date-time" ? (
                  <section
                    data-picker-panel="time"
                    aria-label={`Horário de Brasília para ${label.toLocaleLowerCase("pt-BR")}`}
                    className="min-w-0 border-t border-[var(--border)] pt-2 min-[640px]:flex min-[640px]:h-full min-[640px]:flex-col min-[640px]:border-l min-[640px]:border-t-0 min-[640px]:pt-0 min-[640px]:pl-2"
                  >
                    <p className="text-center text-xs font-semibold leading-tight text-[var(--muted)] min-[640px]:sr-only">
                      Horário de Brasília
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <TimeWheel
                        id={`${calendarId}-hour`}
                        label={`Hora de ${label.toLocaleLowerCase("pt-BR")}`}
                        value={(timePart(value) || "00:00").split(":")[0]}
                        maxValue={23}
                        disabled={disabled || readOnly || !datePart(value)}
                        open={isOpen}
                        onChange={(nextValue) => updateTime("hour", nextValue)}
                      />
                      <TimeWheel
                        id={`${calendarId}-minute`}
                        label={`Minuto de ${label.toLocaleLowerCase("pt-BR")}`}
                        value={(timePart(value) || "00:00").split(":")[1]}
                        maxValue={59}
                        disabled={disabled || readOnly || !datePart(value)}
                        open={isOpen}
                        onChange={(nextValue) =>
                          updateTime("minute", nextValue)
                        }
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!datePart(value)}
                      onClick={() => {
                        closeCalendar(true);
                        onBlur?.();
                      }}
                      className="mt-2 min-h-11 w-full rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-foreground)] transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 min-[640px]:mt-auto"
                    >
                      Concluir
                    </button>
                  </section>
                ) : null}
              </div>
            </div>,
            portalContainer,
          )
        : null}
    </div>
  );
}
