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

type CalendarControlProps = {
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
  required?: boolean;
};

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const CALENDAR_HEIGHT = 380;

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
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
  required,
}: CalendarControlProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const calendarId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [focusedDate, setFocusedDate] = useState(
    () => value || toISODate(new Date()),
  );
  const [viewMonth, setViewMonth] = useState(() => {
    const selected = parseDate(value);
    const initial = selected ?? new Date();
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
  const dateDraftInvalid =
    dateDraftState.sourceValue === value && dateDraftState.invalid;
  const updateDateDraft = (text: string, invalidDraft = false) =>
    setDateDraftState({ sourceValue: value, text, invalid: invalidDraft });

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
  const calendarHeight = showMonthYearPicker
    ? CALENDAR_HEIGHT
    : 18 + 48 + 28 + (calendarCellCount / 7) * 44;
  const minMonth = min ? parseDate(min) : null;
  const maxMonth = max ? parseDate(max) : null;
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
    const selected = parseDate(value);
    const initial = selected ?? new Date();
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
      const margin = 8;
      const dialog =
        portalContainer instanceof HTMLDialogElement ? portalContainer : null;
      const dialogRect = dialog?.getBoundingClientRect();
      const width = Math.min(344, window.innerWidth - margin * 2);
      const left = Math.max(
        margin,
        Math.min(rect.left, window.innerWidth - width - margin),
      );
      const below = window.innerHeight - rect.bottom - margin;
      const above = rect.top - margin;
      const height = Math.min(calendarHeight, window.innerHeight - margin * 2);
      const openUpward = below < height && above > below;
      const anchoredTop = openUpward ? rect.top - height - 4 : rect.bottom + 4;
      const top = Math.max(
        margin,
        Math.min(anchoredTop, window.innerHeight - height - margin),
      );
      setMenuStyle({
        position: dialogRect ? "absolute" : "fixed",
        left: dialogRect ? left - dialogRect.left : left,
        top: dialogRect ? top - dialogRect.top : top,
        width,
        height,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [calendarHeight, isOpen, portalContainer]);

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

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const target = event.relatedTarget;
    if (
      target instanceof Node &&
      (rootRef.current?.contains(target) || menuRef.current?.contains(target))
    )
      return;
    if (dateDraftInvalid || dateDraft.length > 0) {
      const digits = dateDraft.replace(/\D/g, "");
      const typedDate = parseDateDraft(digits);
      if (
        typedDate &&
        (!min || toISODate(typedDate) >= min) &&
        (!max || toISODate(typedDate) <= max)
      ) {
        onValueChange(toISODate(typedDate));
      } else if (digits.length === 0) {
        onValueChange("");
      }
      updateDateDraft(formatDate(value));
    }
    closeCalendar();
    onBlur?.();
  };

  const handleDateDraftChange = (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "").slice(0, 8);
    updateDateDraft(formatDateDraft(digits));
    if (digits.length === 0) {
      onValueChange("");
      return;
    }
    if (digits.length < 8) return;
    const typedDate = parseDateDraft(digits);
    const isoDate = typedDate ? toISODate(typedDate) : "";
    const isInRange =
      Boolean(typedDate) &&
      (!min || isoDate >= min) &&
      (!max || isoDate <= max);
    updateDateDraft(formatDateDraft(digits), !isInRange);
    if (isInRange) {
      onValueChange(isoDate);
      setViewMonth(
        new Date(typedDate!.getFullYear(), typedDate!.getMonth(), 1),
      );
      setYearDraft(`${typedDate!.getFullYear()}`);
      setFocusedDate(isoDate);
    }
  };

  const chooseDate = (date: Date) => {
    const isoDate = toISODate(date);
    if ((min && isoDate < min) || (max && isoDate > max)) return;
    onValueChange(isoDate);
    closeCalendar(true);
    onBlur?.();
  };

  return (
    <div ref={rootRef} className="min-w-0" onBlur={handleBlur}>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          autoComplete="off"
          inputMode="numeric"
          value={dateDraft}
          placeholder={placeholder}
          disabled={disabled}
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
          onChange={(event) => handleDateDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isOpen) {
              event.preventDefault();
              closeCalendar(true);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              openCalendar();
            } else if (event.key === "Enter") {
              event.preventDefault();
              const parsedDate = parseDateDraft(dateDraft.replace(/\D/g, ""));
              const isoDate = parsedDate ? toISODate(parsedDate) : "";
              const isInRange =
                Boolean(parsedDate) &&
                (!min || isoDate >= min) &&
                (!max || isoDate <= max);
              if (parsedDate && isInRange) {
                onValueChange(isoDate);
                closeCalendar(true);
                onBlur?.();
              } else if (parsedDate) {
                updateDateDraft(dateDraft, true);
              } else {
                openCalendar();
              }
            }
          }}
          className={`${className} pr-11`}
        />
        <button
          type="button"
          aria-label={`${isOpen ? "Fechar" : "Abrir"} calendário de ${label.toLocaleLowerCase("pt-BR")}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={() => (isOpen ? closeCalendar() : openCalendar())}
          className="absolute right-0 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-r-xl text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed"
        >
          <span className="material-icons text-lg" aria-hidden="true">
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
              className="z-[100] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] shadow-[var(--shadow-soft)]"
            >
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
                  onClick={() => setShowMonthYearPicker((current) => !current)}
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
                        (min && monthLastDay < min) || (max && monthISO > max),
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
                  <div
                    className="grid grid-cols-7"
                    role="grid"
                    aria-label={monthLabel(viewMonth)}
                  >
                    {dates.map((date) => {
                      const isoDate = toISODate(date);
                      const inCurrentMonth =
                        date.getMonth() === viewMonth.getMonth();
                      const isSelected = isoDate === value;
                      const isToday = isoDate === toISODate(new Date());
                      const outOfRange = Boolean(
                        (min && isoDate < min) || (max && isoDate > max),
                      );
                      return (
                        <button
                          key={isoDate}
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
                            const offsets: Record<string, number> = {
                              ArrowLeft: -1,
                              ArrowRight: 1,
                              ArrowUp: -7,
                              ArrowDown: 7,
                            };
                            let nextDate: Date | null = null;
                            if (event.key in offsets) {
                              nextDate = new Date(date);
                              nextDate.setDate(
                                nextDate.getDate() + offsets[event.key],
                              );
                            } else if (
                              event.key === "PageUp" ||
                              event.key === "PageDown"
                            ) {
                              nextDate = new Date(
                                date.getFullYear(),
                                date.getMonth() +
                                  (event.key === "PageUp" ? -1 : 1),
                                date.getDate(),
                              );
                            }
                            if (!nextDate) return;
                            event.preventDefault();
                            const nextISO = toISODate(nextDate);
                            const boundedISO =
                              min && nextISO < min
                                ? min
                                : max && nextISO > max
                                  ? max
                                  : nextISO;
                            const boundedDate = parseDate(boundedISO);
                            if (!boundedDate) return;
                            setFocusedDate(boundedISO);
                            setViewMonth(
                              new Date(
                                boundedDate.getFullYear(),
                                boundedDate.getMonth(),
                                1,
                              ),
                            );
                            setYearDraft(`${boundedDate.getFullYear()}`);
                          }}
                          onClick={() => chooseDate(date)}
                          className={`mx-auto inline-flex size-11 items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-30 ${isSelected ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--foreground)] hover:bg-[var(--card-secondary)]"} ${!inCurrentMonth ? "text-[var(--muted)]" : ""} ${isToday && !isSelected ? "ring-1 ring-inset ring-[var(--ring)]" : ""}`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>,
            portalContainer,
          )
        : null}
    </div>
  );
}
