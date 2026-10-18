"use client";

import type { Column, RowData } from "@tanstack/react-table";
import { useSelector } from "@tanstack/react-store";
import { tableFeatures } from "../core/table-features";
import { TableDebouncedInput } from "../inputs/TableDebouncedInput";

export function TableColumnFilter<TData extends RowData>({
  column,
  columnLabel,
}: {
  column: Column<typeof tableFeatures, TData, unknown>;
  columnLabel: string;
}) {
  // Facet helpers memoize their result, so subscribe to both inputs that can
  // invalidate it before asking the column for its current values.
  useSelector(column.table.store, (state) => state.columnFilters);
  useSelector(column.table.store, (state) => state.globalFilter);
  useSelector(column.table.optionsStore!, (options) => options.data);

  const variant = column.columnDef.meta?.filterVariant;
  const filterValue = column.getFilterValue();
  const minMax = variant === "range" ? column.getFacetedMinMaxValues() : undefined;
  const facetedValues = variant === "range" ? undefined : column.getFacetedUniqueValues();
  const uniqueValues = facetedValues ? Array.from(facetedValues.keys()).sort().slice(0, 500) : [];
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
        placeholder={`Buscar (${facetedValues?.size ?? 0})`}
        className={inputClass}
        list={`${column.id}-options`}
      />
    </>
  );
}
