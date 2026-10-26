"use client";

import { type KeyboardEvent, type ReactNode, useRef } from "react";

import {
  IconSelect,
  type IconSelectOption,
} from "@/components/shared/IconSelect";

export type ResponsiveTabOption<Value extends string> =
  IconSelectOption<Value> & {
    tabId: string;
    panelId: string;
  };

type ResponsiveTabsProps<Value extends string> = {
  label: string;
  options: readonly ResponsiveTabOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  variant?: "card" | "embedded";
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

const tabButtonClass =
  "inline-flex min-h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] sm:flex-none sm:gap-2 sm:px-4 sm:text-sm";

export function ResponsiveTabs<Value extends string>({
  label,
  options,
  value,
  onChange,
  variant = "card",
  actions,
  className = "",
  children,
}: ResponsiveTabsProps<Value>) {
  const tabListRef = useRef<HTMLDivElement>(null);
  const mobileOptions: IconSelectOption<Value>[] = options.map(
    ({ value: optionValue, label: optionLabel, icon }) => ({
      value: optionValue,
      label: optionLabel,
      icon,
    }),
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = options.findIndex((option) => option.value === value);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : (currentIndex +
              (event.key === "ArrowRight" ? 1 : -1) +
              options.length) %
            options.length;
    const nextOption = options[nextIndex];
    onChange(nextOption.value);
    Array.from(
      tabListRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-tab-value]",
      ) ?? [],
    )
      .find((tab) => tab.dataset.tabValue === String(nextOption.value))
      ?.focus();
  };

  return (
    <section
      className={`${variant === "embedded" ? "min-h-0 flex flex-1 flex-col" : "min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"} ${className}`}
    >
      <div className="flex min-h-14 w-full items-center gap-2 border-b border-[var(--border)] bg-[var(--card-secondary)] p-3 sm:px-4">
        <IconSelect
          label={label}
          options={mobileOptions}
          value={value}
          onChange={onChange}
          className="relative min-w-0 flex-1 md:hidden"
        />
        <div
          ref={tabListRef}
          role="tablist"
          aria-label={label}
          className="hidden min-w-0 flex-1 items-center gap-1 md:flex"
        >
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                id={option.tabId}
                data-tab-value={String(option.value)}
                aria-controls={option.panelId}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(option.value)}
                onKeyDown={handleKeyDown}
                className={`${tabButtonClass} ${selected ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:bg-[var(--card)]/70"}`}
              >
                {option.icon ? (
                  <span className="material-icons text-lg" aria-hidden="true">
                    {option.icon}
                  </span>
                ) : null}
                {option.label}
              </button>
            );
          })}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
