"use client";

import { useId, useState } from "react";
import {
  type FieldPathByValue,
  type FieldValues,
  useController,
  useFormContext,
} from "react-hook-form";

import { FormFieldValidationShell } from "@/components/forms/validations/FormFieldValidationShell";
import { filterGenreSuggestions } from "@/domains/songs/genreSuggestions";

type SongGenreFieldProps<TFieldValues extends FieldValues> = {
  name: FieldPathByValue<TFieldValues, string>;
  suggestions: readonly string[];
  onRemember?: (genre: string) => void;
  validatedOnOpen?: boolean;
  readOnly?: boolean;
  infoMessage?: string;
};

export function SongGenreField<TFieldValues extends FieldValues>({
  name,
  suggestions,
  onRemember,
  validatedOnOpen = false,
  readOnly = false,
  infoMessage,
}: SongGenreFieldProps<TFieldValues>) {
  const listId = useId();
  const { control } = useFormContext<TFieldValues>();
  const { field, fieldState } = useController({ control, name });
  const value = typeof field.value === "string" ? field.value : "";
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const matches = filterGenreSuggestions(suggestions, value);
  const showList = open && !readOnly && matches.length > 0;
  const active = matches[Math.min(activeIndex, Math.max(matches.length - 1, 0))];
  const state = fieldState.invalid
    ? "invalid"
    : fieldState.isTouched || fieldState.isDirty || validatedOnOpen
      ? "valid"
      : "info";

  const remember = (next: string) => {
    const text = next.trim();
    if (text) onRemember?.(text);
  };

  const choose = (next: string) => {
    field.onChange(next);
    remember(next);
    setOpen(false);
  };

  return (
    <FormFieldValidationShell
      label="Gênero"
      name={field.name}
      required={false}
      disabled={readOnly}
      readOnly={readOnly}
      state={state}
      message={fieldState.error?.message}
      description={infoMessage ?? "Opcional"}
      autoComplete="off"
      placeholder="Digite o gênero"
      value={value}
      onValueChange={() => undefined}
      labelForControl
      renderControl={({ id, describedBy, invalid, className }) => (
        <div>
          <input
            ref={field.ref}
            id={id}
            name={field.name}
            role="combobox"
            type="text"
            value={value}
            disabled={readOnly}
            readOnly={readOnly}
            autoComplete="off"
            placeholder="Digite o gênero"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={
              showList && active ? `${listId}-${activeIndex}` : undefined
            }
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={className}
            onFocus={() => {
              setOpen(true);
              setActiveIndex(0);
            }}
            onChange={(event) => {
              field.onChange(event.target.value);
              setOpen(true);
              setActiveIndex(0);
            }}
            onBlur={() => {
              field.onBlur();
              remember(value);
              setOpen(false);
            }}
            onKeyDown={(event) => {
              if (!showList) {
                if (event.key === "ArrowDown") setOpen(true);
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) =>
                  Math.min(current + 1, matches.length - 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              } else if (event.key === "Enter" && active) {
                event.preventDefault();
                choose(active);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {showList ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Gêneros sugeridos"
              className="mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] py-1"
            >
              {matches.map((genre, index) => (
                <li key={`${genre}-${index}`} role="presentation">
                  <button
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`flex min-h-11 w-full items-center px-3 text-left text-sm ${
                      index === activeIndex
                        ? "bg-[var(--card-secondary)]"
                        : "hover:bg-[var(--card-secondary)]"
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(genre)}
                  >
                    {genre}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    />
  );
}
