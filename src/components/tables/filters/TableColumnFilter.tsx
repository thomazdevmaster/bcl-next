"use client";

import { useSelector } from "@tanstack/react-store";
import type { Column, RowData } from "@tanstack/react-table";

import {
  IconSelect,
  type IconSelectOption,
} from "@/components/shared/IconSelect";

import { tableFeatures } from "../core/table-features";
import { tableControlMotion } from "../core/tableMotion";
import { TableDebouncedInput } from "../inputs/TableDebouncedInput";
import { TableFilterPopover } from "./TableFilterPopover";

export function TableColumnFilter<TData extends RowData>({
  column,
  columnLabel,
  resetKey,
}: {
  column: Column<typeof tableFeatures, TData, unknown>;
  columnLabel: string;
  resetKey?: number;
}) {
  // State changes rerender through these subscriptions. Data replacement
  // rerenders the parent header through useTable's render-phase options update.
  useSelector(column.table.store, (state) => state.columnFilters);
  useSelector(column.table.store, (state) => state.globalFilter);

  const variant = column.columnDef.meta?.filterVariant;
  const filterValue = column.getFilterValue();
  const isRange =
    variant === "range" || variant === "date" || variant === "datetime";
  const isTemporal = variant === "date" || variant === "datetime";
  const minMax = isRange ? column.getFacetedMinMaxValues() : undefined;
  const facetedValues = isRange ? undefined : column.getFacetedUniqueValues();
  const uniqueValues = facetedValues
    ? Array.from(facetedValues.keys()).sort().slice(0, 500)
    : [];
  const inputClass = `mt-2 min-h-11 w-full touch-manipulation rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-2 text-base font-normal text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] min-[960px]:text-sm ${tableControlMotion}`;

  if (isRange) {
    const range = filterValue as
      [number | undefined, number | undefined] | undefined;
    const inputType =
      variant === "date"
        ? "date"
        : variant === "datetime"
          ? "datetime-local"
          : "number";
    const setBound = (bound: "min" | "max", rawValue: string | number) => {
      const parsed =
        rawValue === ""
          ? undefined
          : isTemporal
            ? parseTemporalFilterValue(String(rawValue), variant, bound)
            : Number(rawValue);
      column.setFilterValue(
        (old: [number | undefined, number | undefined] | undefined) =>
          bound === "min" ? [parsed, old?.[1]] : [old?.[0], parsed],
      );
    };
    const boundValue = (bound: "min" | "max") => {
      const value = bound === "min" ? range?.[0] : range?.[1];
      return isTemporal && value !== undefined
        ? formatTemporalFilterValue(value, variant)
        : (value ?? "");
    };
    const boundMin =
      minMax?.[0] === undefined || !isTemporal
        ? minMax?.[0]
        : formatTemporalFilterValue(minMax[0], variant);
    const boundMax =
      minMax?.[1] === undefined || !isTemporal
        ? minMax?.[1]
        : formatTemporalFilterValue(minMax[1], variant);
    const compactInputClass = inputClass.replace("mt-2 ", "");
    const renderRangeBound = (bound: "min" | "max", visibleLabel: string) => (
      <label
        htmlFor={`${column.id}-${bound}-filter`}
        className="grid gap-1 text-sm font-medium"
      >
        {visibleLabel}
        <TableDebouncedInput
          id={`${column.id}-${bound}-filter`}
          aria-label={`${bound === "min" ? "Mínimo" : "Máximo"}: ${columnLabel}`}
          resetKey={resetKey}
          type={inputType}
          min={boundMin}
          max={boundMax}
          value={boundValue(bound)}
          onChange={(value) => setBound(bound, value)}
          placeholder={bound === "min" ? "Mín." : "Máx."}
          className={compactInputClass}
        />
      </label>
    );

    return (
      <TableFilterPopover
        label={`Filtros de ${columnLabel}`}
        triggerLabel={`Abrir filtros de ${columnLabel}`}
        icon={
          isTemporal
            ? variant === "date"
              ? "calendar_month"
              : "event"
            : "filter_alt"
        }
        active={range?.some((bound) => bound !== undefined) ?? false}
      >
        <div className="grid gap-3 p-2">
          <p className="px-1 text-sm text-[var(--muted)]">
            {isTemporal
              ? "Escolha uma data inicial, final ou ambas."
              : "Defina uma quantidade mínima, máxima ou ambas."}
          </p>
          {renderRangeBound(
            "min",
            isTemporal ? "A partir de" : "Quantidade mínima",
          )}
          {renderRangeBound("max", isTemporal ? "Até" : "Quantidade máxima")}
        </div>
      </TableFilterPopover>
    );
  }

  if (variant === "select") {
    const selectedValues = Array.isArray(filterValue)
      ? filterValue.filter(
          (value): value is string => typeof value === "string",
        )
      : typeof filterValue === "string" && filterValue !== ""
        ? [filterValue]
        : [];
    const optionValues = Array.from(
      new Set([...uniqueValues.map(String), ...selectedValues]),
    );
    const selectOptions: IconSelectOption<string>[] = optionValues.map(
      (value) => ({
        value,
        label: value || "(vazio)",
        icon: "label",
      }),
    );
    const hasSelectedFilter = selectedValues.length > 0;

    return (
      <div
        className={`mt-2 flex items-center gap-1 ${hasSelectedFilter ? "w-max max-w-[calc(100vw-2rem)]" : "min-w-0"}`}
      >
        <IconSelect
          label={columnLabel}
          options={selectOptions}
          multiple
          allowEmptySelection
          value={selectedValues}
          onChange={(values) =>
            column.setFilterValue(values.length > 0 ? values : undefined)
          }
          selectedSummary={(selectedOptions) =>
            selectedOptions.length === 0
              ? "Selecione…"
              : `${selectedOptions.length} selecionado${selectedOptions.length === 1 ? "" : "s"}`
          }
          className="relative min-w-0 flex-1"
          triggerClassName={`min-h-11 rounded-[var(--radius)] bg-[var(--input)] px-2 font-normal ${tableControlMotion}`}
          expandMenuToContent
          fitTriggerToContent={hasSelectedFilter}
          wrapOptionLabels
        />
        {hasSelectedFilter ? (
          <button
            type="button"
            aria-label={`Limpar filtro ${columnLabel}`}
            onClick={() => column.setFilterValue(undefined)}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] text-[var(--muted)] transition-colors hover:bg-[var(--card-secondary)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <span className="material-icons text-lg" aria-hidden="true">
              close
            </span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <datalist id={`${column.id}-options`}>
        {uniqueValues.map((value) => (
          <option key={String(value)} value={String(value)} />
        ))}
      </datalist>
      <TableDebouncedInput
        aria-label={`Filtrar ${columnLabel}`}
        resetKey={resetKey}
        type="text"
        value={String(filterValue ?? "")}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={`Buscar (${facetedValues?.size ?? 0})`}
        className={inputClass}
        list={`${column.id}-options`}
      />
    </>
  );
}

export function parseTemporalFilterValue(
  value: string,
  variant: "date" | "datetime",
  bound: "min" | "max",
): number {
  const date =
    variant === "date"
      ? (() => {
          const [year, month, day] = value.split("-").map(Number);
          return new Date(year, month - 1, day);
        })()
      : new Date(value);
  if (bound === "max") {
    if (variant === "date") date.setHours(23, 59, 59, 999);
    else date.setSeconds(59, 999);
  }
  return date.getTime();
}

function formatTemporalFilterValue(
  value: number,
  variant: "date" | "datetime",
): string {
  const date = new Date(value);
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (variant === "date") return `${year}-${month}-${day}`;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
