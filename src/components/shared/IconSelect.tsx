"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

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
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const selectedValues = props.multiple ? props.value : [props.value];
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const selectedLabel = props.multiple
    ? selectedOptions.length === 1
      ? selectedOptions[0].label
      : `${selectedOptions.length} perfis ativos`
    : options.find((option) => option.value === props.value)?.label;
  const selectedIcon = selectedOptions[0]?.icon;

  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updateMenuPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportMargin = 8;
      const gap = 8;
      const menuWidth = Math.min(Math.max(rect.width, 176), window.innerWidth - viewportMargin * 2);
      const left = Math.min(Math.max(rect.left, viewportMargin), window.innerWidth - viewportMargin - menuWidth);
      const desiredHeight = Math.min(options.length * 44 + 8, 320);
      const spaceAbove = Math.max(0, rect.top - gap - viewportMargin);
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap - viewportMargin);
      const openUpward = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
      const availableHeight = openUpward ? spaceAbove : spaceBelow;
      const menuHeight = Math.min(desiredHeight, availableHeight);

      setMenuStyle({
        left,
        top: openUpward ? rect.top - gap - menuHeight : rect.bottom + gap,
        width: menuWidth,
        maxHeight: menuHeight,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [isOpen]);

  const closeWhenFocusLeaves = (relatedTarget: EventTarget | null) => {
    if (relatedTarget instanceof Node) {
      if (rootRef.current?.contains(relatedTarget) || menuRef.current?.contains(relatedTarget)) return;
    }
    setIsOpen(false);
  };

  if (!selectedLabel) return null;

  return (
    <div ref={rootRef} className={className} onBlur={(event) => closeWhenFocusLeaves(event.relatedTarget)}>
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
      {isOpen && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              onBlur={(event) => closeWhenFocusLeaves(event.relatedTarget)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeMenu();
                }
              }}
              style={menuStyle}
              className="fixed z-[100] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-[var(--shadow-soft)]"
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
