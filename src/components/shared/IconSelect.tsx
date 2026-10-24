"use client";

import { useRef, useState } from "react";

export type IconSelectOption<Value extends string> = {
  value: Value;
  label: string;
  icon?: string;
};

type SingleSelectProps<Value extends string> = {
  multiple?: false;
  value: Value;
  onChange: (value: Value) => void;
};

type MultipleSelectProps<Value extends string> = {
  multiple: true;
  value: readonly Value[];
  onChange: (value: Value[]) => void;
};

type IconSelectProps<Value extends string> = {
  label: string;
  options: readonly IconSelectOption<Value>[];
  className?: string;
  disabled?: boolean;
} & (SingleSelectProps<Value> | MultipleSelectProps<Value>);

export function IconSelect<Value extends string>(props: IconSelectProps<Value>) {
  const { label, options, className = "relative min-w-0 w-full", disabled = false } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedValues = props.multiple ? props.value : [props.value];
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const selectedLabel = props.multiple
    ? selectedOptions.length === 1
      ? selectedOptions[0].label
      : `${selectedOptions.length} perfis ativos`
    : options.find((option) => option.value === props.value)?.label;
  const selectedIcon = selectedOptions[0]?.icon;

  if (!selectedLabel) return null;

  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={className}
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label}: ${selectedLabel}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            closeMenu();
          }
        }}
        className="inline-flex min-h-11 w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-left text-sm font-semibold text-[var(--foreground)] outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        {selectedIcon ? (
          <span className="material-icons text-lg" aria-hidden="true">
            {selectedIcon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <span className="material-icons text-lg text-[var(--muted)]" aria-hidden="true">
          expand_more
        </span>
      </button>
      {isOpen ? (
        <div
          role="menu"
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeMenu();
            }
          }}
          className="absolute left-0 top-full z-20 mt-2 w-full min-w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-[var(--shadow-soft)]"
        >
          {options.map((option) => {
            const selected = selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role={props.multiple ? "menuitemcheckbox" : "menuitemradio"}
                aria-checked={selected}
                onClick={() => {
                  if (props.multiple) {
                    if (selected && selectedValues.length === 1) return;
                    const nextValues = selected
                      ? selectedValues.filter((selectedValue) => selectedValue !== option.value)
                      : [...selectedValues, option.value];
                    props.onChange(nextValues);
                    return;
                  }
                  props.onChange(option.value);
                  closeMenu();
                }}
                className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ring)] ${selected ? "bg-[var(--card-secondary)] text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[var(--card-secondary)]"}`}
              >
                {option.icon ? (
                  <span className="material-icons text-lg" aria-hidden="true">
                    {option.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">{option.label}</span>
                {selected ? (
                  <span className="material-icons text-lg" aria-hidden="true">
                    check
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
