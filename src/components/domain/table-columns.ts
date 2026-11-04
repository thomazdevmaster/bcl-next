import { createColumnHelper } from "@tanstack/react-table";

import { tableFeatures } from "@/components/tables/core/table-features";
import type { TableColumnDef } from "@/components/tables/core/table-features";
import type { CrudResource } from "@/core/auth/permissions";
import type { CrudColumn } from "@/domains/crudConfig";
import { getValue } from "@/domains/crudConfig";

type TableRecord = Record<string, unknown>;
type CellFormatter = (row: TableRecord, column: CrudColumn) => string;
type FilterVariant = "text" | "range" | "date" | "datetime" | "select";

const FORMATTED_FILTER_VARIANTS: Partial<
  Record<NonNullable<CrudColumn["format"]>, FilterVariant>
> = {
  date: "date",
  datetime: "datetime",
  count: "range",
  currency: "range",
  boolean: "select",
  roles: "select",
  status: "select",
};

const columnHelper = createColumnHelper<typeof tableFeatures, TableRecord>();

/** Adapta as colunas CRUD para a tabela compartilhada sem acoplar a tabela aos domínios. */
export function createDomainTableColumns(
  columns: CrudColumn[],
  formatCell: CellFormatter,
  resource: CrudResource,
): TableColumnDef<TableRecord>[] {
  return columns.map((column) => {
    const filterVariant = getFilterVariant(column, resource);
    const definition = columnHelper.accessor(
      (row) => getColumnValue(row, column, formatCell),
      {
        id: column.path,
        header: column.label,
        meta: { filterVariant },
        ...(filterVariant === "select"
          ? { filterFn: "includesAnyString" as const }
          : {}),
        cell: ({ row }) => formatCell(row.original, column),
      },
    );
    if (column.format === "count") {
      definition.aggregationFn = "sum";
      definition.aggregatedCell = ({ getValue }) =>
        Number(getValue()).toLocaleString("pt-BR");
    }
    return definition;
  });
}

function getFilterVariant(
  column: CrudColumn,
  resource: CrudResource,
): FilterVariant {
  if (isSongCatalogSelect(column, resource)) return "select";
  if (resource === "presentations" && column.path === "eventType.name") {
    return "select";
  }
  const formattedVariant = column.format
    ? FORMATTED_FILTER_VARIANTS[column.format]
    : undefined;
  if (formattedVariant) return formattedVariant;
  return "text";
}

function isSongCatalogSelect(
  column: CrudColumn,
  resource: CrudResource,
): boolean {
  return (
    resource === "songs" && (column.path === "genre" || column.path === "key")
  );
}

function getColumnValue(
  row: TableRecord,
  column: CrudColumn,
  formatCell: CellFormatter,
): unknown {
  const value = getValue(row, column.path);
  switch (column.format) {
    case "count":
      return countValue(value);
    case "currency":
      return currencyValue(value);
    case "date":
    case "datetime":
      return temporalValue(value);
    case undefined:
      return value == null ? "" : String(value);
    default:
      return formatCell(row, column);
  }
}

function countValue(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function currencyValue(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function temporalValue(value: unknown): number | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
}
