"use client";

import type { Column, RowData } from "@tanstack/react-table";
import { useSelector } from "@tanstack/react-store";
import { tableFeatures } from "../core/table-features";
import { TableDebouncedInput } from "../inputs/TableDebouncedInput";

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
  const isRange = variant === "range" || variant === "date" || variant === "datetime";
  const isTemporal = variant === "date" || variant === "datetime";
  const minMax = isRange ? column.getFacetedMinMaxValues() : undefined;
  const facetedValues = isRange ? undefined : column.getFacetedUniqueValues();
  const uniqueValues = facetedValues ? Array.from(facetedValues.keys()).sort().slice(0, 500) : [];
  const inputClass =
    "mt-2 min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-2 text-sm font-normal text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

  if (isRange) {
    const range = filterValue as [number | undefined, number | undefined] | undefined;
    const inputType = variant === "date" ? "date" : variant === "datetime" ? "datetime-local" : "number";
    const setBound = (bound: "min" | "max", rawValue: string | number) => {
      const parsed = rawValue === ""
        ? undefined
        : isTemporal
          ? parseTemporalFilterValue(String(rawValue), variant, bound)
          : Number(rawValue);
      column.setFilterValue((old: [number | undefined, number | undefined] | undefined) =>
        bound === "min" ? [parsed, old?.[1]] : [old?.[0], parsed],
      );
    };
    const boundValue = (bound: "min" | "max") => {
      const value = bound === "min" ? range?.[0] : range?.[1];
      return isTemporal && value !== undefined ? formatTemporalFilterValue(value, variant) : value ?? "";
    };
    const boundMin = minMax?.[0] === undefined || !isTemporal
      ? minMax?.[0]
      : formatTemporalFilterValue(minMax[0], variant);
    const boundMax = minMax?.[1] === undefined || !isTemporal
      ? minMax?.[1]
      : formatTemporalFilterValue(minMax[1], variant);
    return (
      <div className="mt-2 flex gap-1">
        <TableDebouncedInput
          aria-label={`Mínimo: ${columnLabel}`}
          resetKey={resetKey}
          type={inputType}
          min={boundMin}
          max={boundMax}
          value={boundValue("min")}
          onChange={(value) => setBound("min", value)}
          placeholder="Mín."
          className={inputClass}
        />
        <TableDebouncedInput
          aria-label={`Máximo: ${columnLabel}`}
          resetKey={resetKey}
          type={inputType}
          min={boundMin}
          max={boundMax}
          value={boundValue("max")}
          onChange={(value) => setBound("max", value)}
          placeholder="Máx."
          className={inputClass}
        />
      </div>
    );
  }

  if (variant === "select") {
    return (
      <select
        aria-label={`Filtrar ${columnLabel}`}
        value={String(filterValue ?? "")}
        onChange={(event) => column.setFilterValue(event.target.value)}
        className={inputClass}
      >
        <option value="">Todos</option>
        {uniqueValues.map((value) => (
          <option key={String(value)} value={String(value)}>
            {String(value)}
          </option>
        ))}
      </select>
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

function parseTemporalFilterValue(
  value: string,
  variant: "date" | "datetime",
  bound: "min" | "max",
): number {
  const date = variant === "date"
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

function formatTemporalFilterValue(value: number, variant: "date" | "datetime"): string {
  const date = new Date(value);
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (variant === "date") return `${year}-${month}-${day}`;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
