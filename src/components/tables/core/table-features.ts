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
  filterFns,
  metaHelper,
  sortFns,
  stockFeatures,
  tableFeatures as defineTableFeatures,
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
import { compareItems, rankItem } from "@tanstack/match-sorter-utils";
import type { RankingInfo } from "@tanstack/match-sorter-utils";

interface ColumnMeta {
  filterVariant?: "text" | "range" | "select";
}

interface FuzzyFilterMeta {
  itemRank?: RankingInfo;
}

type FuzzyFeatures = TableFeatures & { filterMeta: FuzzyFilterMeta };

const fuzzyFilter: FilterFn<FuzzyFeatures, RowData> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue<unknown>(columnId), String(value ?? ""));
  addMeta?.({ itemRank });
  return itemRank.passed;
};

const fuzzySort: SortFn<FuzzyFeatures, RowData> = (rowA, rowB, columnId) => {
  const rankA = rowA.columnFiltersMeta[columnId]?.itemRank;
  const rankB = rowB.columnFiltersMeta[columnId]?.itemRank;
  return rankA && rankB
    ? compareItems(rankA, rankB) || sortFns.alphanumeric(rowA, rowB, columnId)
    : sortFns.alphanumeric(rowA, rowB, columnId);
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
  filterFns: { ...filterFns, fuzzy: fuzzyFilter },
  sortFns: { ...sortFns, fuzzy: fuzzySort },
  aggregationFns,
});

export type TableState = Omit<TanStackTableState<typeof tableFeatures>, "cellSelection">;
export type TableColumn<TData extends RowData> = Column<typeof tableFeatures, TData>;
export type TableColumnDef<TData extends RowData> = ColumnDef<typeof tableFeatures, TData>;
