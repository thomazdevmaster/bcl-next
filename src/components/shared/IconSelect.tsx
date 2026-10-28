"use client";

import { useDebouncer } from "@tanstack/react-pacer/debouncer";
import Image from "next/image";
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type IconSelectOption<Value extends string> = {
  value: Value;
  label: string;
  icon?: string;
  imageSrc?: string;
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
  allowEmptySelection?: boolean;
  selectedSummary?: (
    selectedOptions: readonly IconSelectOption<Value>[],
  ) => string;
};

type IconSelectProps<Value extends string> = {
  label: string;
  options: readonly IconSelectOption<Value>[];
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
  onTriggerRef?: (element: HTMLButtonElement | null) => void;
  onBlur?: () => void;
} & (SingleSelectProps<Value> | MultipleSelectProps<Value>);

const SEARCH_THRESHOLD = 12;
const VIRTUALIZATION_THRESHOLD = SEARCH_THRESHOLD;
const OPTION_HEIGHT = 44;
const VIRTUAL_OVERSCAN = 5;

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function IconSelect<Value extends string>(
  props: IconSelectProps<Value>,
) {
  const {
    label,
    options,
    className = "relative min-w-0 w-full",
    triggerClassName,
    disabled = false,
    id,
    describedBy,
    invalid,
    required,
    onTriggerRef,
    onBlur,
  } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pointerInteractionInMenuRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>();
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [listScrollTop, setListScrollTop] = useState(0);
  const searchDebouncer = useDebouncer(
    (value: string) => setDebouncedSearchQuery(value),
    { wait: 300 },
  );
  const selectedValues = props.multiple ? props.value : [props.value];
  const selectedOptions = options.filter((option) =>
    selectedValues.includes(option.value),
  );
  const selectedLabel = props.multiple
    ? (props.selectedSummary?.(selectedOptions) ??
      (selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions.length} perfis ativos`))
    : options.find((option) => option.value === props.value)?.label;
  const selectedIcon = selectedOptions[0]?.icon;
  const selectedImageSrc = selectedOptions[0]?.imageSrc;
  const searchEnabled = options.length > SEARCH_THRESHOLD;
  const normalizedSearchQuery = normalizeSearchText(
    debouncedSearchQuery.trim(),
  );
  const visibleOptions =
    searchEnabled && normalizedSearchQuery
      ? options.filter((option) =>
          normalizeSearchText(`${option.label} ${option.value}`).includes(
            normalizedSearchQuery,
          ),
        )
      : options;
  const shouldVirtualize = visibleOptions.length > VIRTUALIZATION_THRESHOLD;
  const visibleStart = shouldVirtualize
    ? Math.max(0, Math.floor(listScrollTop / OPTION_HEIGHT) - VIRTUAL_OVERSCAN)
    : 0;
  const visibleEnd = shouldVirtualize
    ? Math.min(
        visibleOptions.length,
        visibleStart + Math.ceil(320 / OPTION_HEIGHT) + VIRTUAL_OVERSCAN * 2,
      )
    : visibleOptions.length;
  const renderedOptions = visibleOptions.slice(visibleStart, visibleEnd);

  const closeMenu = () => {
    setIsOpen(false);
    resetSearch();
    pointerInteractionInMenuRef.current = false;
    triggerRef.current?.focus();
  };

  const resetSearch = () => {
    searchDebouncer.cancel();
    setSearchQuery("");
    setDebouncedSearchQuery("");
  };

  const renderOption = (option: IconSelectOption<Value>) => {
    const selected = selectedValues.includes(option.value);
    return (
      <button
        key={option.value}
        type="button"
        role={props.multiple ? "menuitemcheckbox" : "option"}
        aria-checked={props.multiple ? selected : undefined}
        aria-selected={!props.multiple ? selected : undefined}
        onClick={() => {
          if (props.multiple) {
            if (
              selected &&
              selectedValues.length === 1 &&
              !props.allowEmptySelection
            )
              return;
            const nextValues = selected
              ? selectedValues.filter(
                  (selectedValue) => selectedValue !== option.value,
                )
              : [...selectedValues, option.value];
            props.onChange(nextValues);
            return;
          }
          props.onChange(option.value);
          onBlur?.();
          closeMenu();
        }}
        disabled={disabled}
        className={`flex h-11 w-full items-center gap-2 px-3 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "bg-[var(--card-secondary)] text-[var(--foreground)]" : "text-[var(--muted)] hover:bg-[var(--card-secondary)]"}`}
      >
        {option.imageSrc ? (
          <Image
            src={option.imageSrc}
            width={28}
            height={20}
            unoptimized
            alt=""
            aria-hidden="true"
            className="h-5 w-7 shrink-0 rounded-[2px] border border-[var(--border)] bg-white object-contain"
          />
        ) : option.icon ? (
          <span className="material-icons text-lg" aria-hidden="true">
            {option.icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {selected ? (
          <span className="material-icons text-lg" aria-hidden="true">
            check
          </span>
        ) : null}
      </button>
    );
  };

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updateMenuPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportMargin = 8;
      const gap = 8;
      const dialog =
        portalContainer instanceof HTMLDialogElement ? portalContainer : null;
      const dialogRect = dialog?.getBoundingClientRect();
      const bounds = {
        top: viewportMargin,
        right: window.innerWidth - viewportMargin,
        bottom: window.innerHeight - viewportMargin,
        left: viewportMargin,
      };
      const boundsWidth = Math.max(0, bounds.right - bounds.left);
      const menuWidth = Math.min(
        Math.max(rect.width, Math.min(176, boundsWidth)),
        boundsWidth,
      );
      const left = Math.min(
        Math.max(rect.left, bounds.left),
        bounds.right - menuWidth,
      );
      const desiredHeight = Math.min(options.length * 44 + 10, 320);
      const spaceAbove = Math.max(0, rect.top - gap - bounds.top);
      const spaceBelow = Math.max(0, bounds.bottom - rect.bottom - gap);
      const openUpward = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
      const availableHeight = openUpward ? spaceAbove : spaceBelow;
      const menuHeight = Math.min(desiredHeight, availableHeight);
      const viewportTop = openUpward
        ? rect.top - gap - menuHeight
        : rect.bottom + gap;

      setMenuStyle({
        left: dialogRect ? left - dialogRect.left : left,
        top: dialogRect ? viewportTop - dialogRect.top : viewportTop,
        width: menuWidth,
        height: menuHeight,
        position: dialogRect ? "absolute" : "fixed",
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, options.length, portalContainer]);

  useEffect(() => {
    if (!isOpen) return;

    const isPointerInsideMenu = (event: PointerEvent): boolean => {
      const menu = menuRef.current;
      if (!menu) return false;
      if (event.target instanceof Node && menu.contains(event.target))
        return true;

      const bounds = menu.getBoundingClientRect();
      return (
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom
      );
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target)
      )
        return;
      if (isPointerInsideMenu(event)) {
        pointerInteractionInMenuRef.current = true;
        return;
      }
      pointerInteractionInMenuRef.current = false;
      setIsOpen(false);
      searchDebouncer.cancel();
      setSearchQuery("");
      setDebouncedSearchQuery("");
    };
    const resetMenuPointerInteraction = () => {
      pointerInteractionInMenuRef.current = false;
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("pointerup", resetMenuPointerInteraction, true);
    document.addEventListener(
      "pointercancel",
      resetMenuPointerInteraction,
      true,
    );
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener(
        "pointerup",
        resetMenuPointerInteraction,
        true,
      );
      document.removeEventListener(
        "pointercancel",
        resetMenuPointerInteraction,
        true,
      );
    };
  }, [isOpen, searchDebouncer]);

  const closeWhenFocusLeaves = (relatedTarget: EventTarget | null) => {
    if (relatedTarget instanceof Node) {
      if (
        rootRef.current?.contains(relatedTarget) ||
        menuRef.current?.contains(relatedTarget)
      )
        return;
    }
    if (pointerInteractionInMenuRef.current) return;
    setIsOpen(false);
    resetSearch();
    onBlur?.();
  };

  if (!selectedLabel) return null;

  return (
    <div
      ref={rootRef}
      className={className}
      onBlur={(event) => closeWhenFocusLeaves(event.relatedTarget)}
    >
      <button
        ref={(element) => {
          triggerRef.current = element;
          onTriggerRef?.(element);
        }}
        id={id}
        type="button"
        aria-label={`${label}: ${selectedLabel}`}
        aria-describedby={describedBy}
        role={props.multiple ? "button" : "combobox"}
        aria-invalid={!props.multiple && invalid ? true : undefined}
        aria-required={!props.multiple && required ? true : undefined}
        aria-haspopup={props.multiple ? "menu" : "listbox"}
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => {
          resetSearch();
          if (!isOpen) {
            setPortalContainer(
              rootRef.current?.closest("dialog") ?? document.body,
            );
          }
          setIsOpen((open) => !open);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            closeMenu();
          }
        }}
        className={`inline-flex min-h-11 w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-left text-sm font-semibold text-[var(--foreground)] outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${triggerClassName ?? ""}`}
      >
        {selectedImageSrc ? (
          <Image
            src={selectedImageSrc}
            width={28}
            height={20}
            unoptimized
            alt=""
            aria-hidden="true"
            className="h-5 w-7 shrink-0 rounded-[2px] border border-[var(--border)] bg-white object-contain"
          />
        ) : selectedIcon ? (
          <span className="material-icons text-lg" aria-hidden="true">
            {selectedIcon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <span
          className="material-icons -mr-2.5 shrink-0 text-lg text-[var(--muted)]"
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>
      {isOpen && menuStyle && portalContainer
        ? createPortal(
            <div
              ref={menuRef}
              role="group"
              aria-label={`${label} opções`}
              onBlur={(event) => closeWhenFocusLeaves(event.relatedTarget)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeMenu();
                }
              }}
              style={menuStyle}
              className="z-[100] flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
            >
              {searchEnabled ? (
                <div className="shrink-0 border-b border-[var(--border)] bg-[var(--card-secondary)] p-2">
                  <div className="flex min-h-11 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 text-sm text-[var(--foreground)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
                    <span
                      className="material-icons shrink-0 text-lg text-[var(--muted)]"
                      aria-hidden="true"
                    >
                      search
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      autoComplete="off"
                      inputMode="search"
                      aria-label={`Buscar ${label.toLocaleLowerCase("pt-BR")}`}
                      placeholder="Buscar…"
                      value={searchQuery}
                      onChange={(event) => {
                        const nextQuery = event.target.value;
                        setSearchQuery(nextQuery);
                        setListScrollTop(0);
                        const list =
                          menuRef.current?.querySelector<HTMLElement>(
                            '[role="listbox"], [role="menu"]',
                          );
                        if (list) list.scrollTop = 0;
                        searchDebouncer.maybeExecute(nextQuery);
                      }}
                      className="min-w-0 flex-1 bg-transparent px-1 outline-none placeholder:text-[var(--muted)]"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        aria-label={`Limpar busca de ${label.toLocaleLowerCase("pt-BR")}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          resetSearch();
                          searchInputRef.current?.focus();
                        }}
                        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ring)]"
                      >
                        <span
                          className="material-icons text-lg"
                          aria-hidden="true"
                        >
                          close
                        </span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div
                role={props.multiple ? "menu" : "listbox"}
                aria-label={label}
                onScroll={(event) => {
                  if (shouldVirtualize)
                    setListScrollTop(event.currentTarget.scrollTop);
                }}
                className="min-h-0 flex-1 overscroll-contain overflow-y-auto"
              >
                {visibleOptions.length === 0 ? (
                  <div
                    role={props.multiple ? "menuitem" : "option"}
                    aria-disabled="true"
                    aria-selected={!props.multiple ? false : undefined}
                    className="px-3 py-3 text-sm text-[var(--muted)]"
                  >
                    Nenhuma opção encontrada.
                  </div>
                ) : null}
                {shouldVirtualize ? (
                  <div
                    role="presentation"
                    style={{ height: visibleOptions.length * OPTION_HEIGHT }}
                    className="relative"
                  >
                    <div
                      style={{
                        transform: `translateY(${visibleStart * OPTION_HEIGHT}px)`,
                      }}
                      className="absolute inset-x-0 top-0"
                    >
                      {renderedOptions.map((option) => renderOption(option))}
                    </div>
                  </div>
                ) : (
                  visibleOptions.map((option) => renderOption(option))
                )}
              </div>
            </div>,
            portalContainer,
          )
        : null}
    </div>
  );
}
