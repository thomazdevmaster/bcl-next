"use client";

import type { Column, RowData } from "@tanstack/react-table";

import { useMemo } from "react";
import { tableFeatures } from "../core/table-features";
import { TableDebouncedInput } from "../inputs/TableDebouncedInput";

export function TableColumnFilter<TData extends RowData>({
  column,
  columnLabel,
}: {
  column: Column<typeof tableFeatures, TData, unknown>;
  columnLabel: string;
}) {
  const variant = column.columnDef.meta?.filterVariant;
  const filterValue = column.getFilterValue();
  const minMax = variant === "range" ? column.getFacetedMinMaxValues() : undefined;
  const uniqueValues = useMemo(
    () => (variant === "range" ? [] : Array.from(column.getFacetedUniqueValues().keys()).sort().slice(0, 500)),
    [column, variant],
  );
  const inputClass =
    "mt-2 min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-2 text-sm font-normal text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

  if (variant === "range") {
    const range = filterValue as [number | undefined, number | undefined] | undefined;
    return (
      <div className="mt-2 flex gap-1">
        <TableDebouncedInput
          aria-label={`Mínimo: ${columnLabel}`}
          type="number"
          min={minMax?.[0]}
          max={minMax?.[1]}
          value={range?.[0] ?? ""}
          onChange={(value) => column.setFilterValue((old: [number | undefined, number | undefined] | undefined) => [value === "" ? undefined : Number(value), old?.[1]])}
          placeholder="Mín."
          className={inputClass}
        />
        <TableDebouncedInput
          aria-label={`Máximo: ${columnLabel}`}
          type="number"
          min={minMax?.[0]}
          max={minMax?.[1]}
          value={range?.[1] ?? ""}
          onChange={(value) => column.setFilterValue((old: [number | undefined, number | undefined] | undefined) => [old?.[0], value === "" ? undefined : Number(value)])}
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
        type="text"
        value={String(filterValue ?? "")}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={`Buscar (${column.getFacetedUniqueValues().size})`}
        className={inputClass}
        list={`${column.id}-options`}
      />
    </>
  );
}
