import { compareItems, rankItem } from "@tanstack/match-sorter-utils";
import type { RankingInfo } from "@tanstack/match-sorter-utils";
import {
  aggregationFns,
  createExpandedRowModel,
  createFacetedMinMaxValues,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  tableFeatures as defineTableFeatures,
  filterFns,
  metaHelper,
  sortFns,
  stockFeatures,
} from "@tanstack/react-table";
import type {
  Column,
  ColumnDef,
  FilterFn,
  RowData,
  SortFn,
  TableFeatures,
  TableState as TanStackTableState,
} from "@tanstack/react-table";

interface ColumnMeta {
  filterVariant?: "text" | "range" | "date" | "datetime" | "select";
}

interface FuzzyFilterMeta {
  itemRank?: RankingInfo;
}

type FuzzyFeatures = TableFeatures & { filterMeta: FuzzyFilterMeta };

export function matchesAnySelectedString(
  cellValue: unknown,
  filterValue: unknown,
): boolean {
  const selectedValues = Array.isArray(filterValue)
    ? filterValue.filter((value): value is string => typeof value === "string")
    : typeof filterValue === "string" && filterValue !== ""
      ? [filterValue]
      : [];
  if (selectedValues.length === 0) return true;
  return selectedValues.includes(String(cellValue ?? ""));
}

const fuzzyFilter: FilterFn<FuzzyFeatures, RowData> = (
  row,
  columnId,
  value,
  addMeta,
) => {
  const itemRank = rankItem(
    row.getValue<unknown>(columnId),
    String(value ?? ""),
  );
  addMeta?.({ itemRank });
  return itemRank.passed;
};

const includesAnyStringFilter: FilterFn<FuzzyFeatures, RowData> = (
  row,
  columnId,
  filterValue,
) => matchesAnySelectedString(row.getValue<unknown>(columnId), filterValue);

const fuzzySort: SortFn<FuzzyFeatures, RowData> = (rowA, rowB, columnId) => {
  const rankA = rowA.columnFiltersMeta[columnId]?.itemRank;
  const rankB = rowB.columnFiltersMeta[columnId]?.itemRank;
  return rankA && rankB
    ? compareItems(rankA, rankB) || sortFns.alphanumeric(rowA, rowB, columnId)
    : sortFns.alphanumeric(rowA, rowB, columnId);
};

const ptBrSort: SortFn<FuzzyFeatures, RowData> = (rowA, rowB, columnId) => {
  const valueA = rowA.getValue<unknown>(columnId);
  const valueB = rowB.getValue<unknown>(columnId);
  if (typeof valueA === "string" && typeof valueB === "string") {
    return valueA.localeCompare(valueB, "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
  }
  return sortFns.alphanumeric(rowA, rowB, columnId);
};

export const tableFeatures = defineTableFeatures({
  ...stockFeatures,
  columnMeta: metaHelper<ColumnMeta>(),
  filterMeta: metaHelper<FuzzyFilterMeta>(),
  filteredRowModel: createFilteredRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
  facetedUniqueValues: createFacetedUniqueValues(),
  groupedRowModel: createGroupedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  filterFns: {
    ...filterFns,
    fuzzy: fuzzyFilter,
    includesAnyString: includesAnyStringFilter,
  },
  sortFns: { ...sortFns, fuzzy: fuzzySort, ptBR: ptBrSort },
  aggregationFns,
});

export type TableState = Omit<
  TanStackTableState<typeof tableFeatures>,
  "cellSelection"
>;
export type TableColumn<TData extends RowData> = Column<
  typeof tableFeatures,
  TData
>;
export type TableColumnDef<TData extends RowData> = ColumnDef<
  typeof tableFeatures,
  TData
>;
