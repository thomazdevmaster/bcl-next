"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Subscribe, createColumnHelper, useTable } from "@tanstack/react-table";
import type { CellSelectionState, RowData } from "@tanstack/react-table";
import { useCreateAtom } from "@tanstack/react-store";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { TableCell } from "../cells/TableCell";
import { TablePinnedRow, rowSelectionKey } from "../cells/TablePinnedRows";
import { useTableCellSelectionHotkeys } from "../cells/useTableCellSelectionHotkeys";
import { TableHeader } from "../columns/TableHeader";
import { useTableColumnDnd } from "../columns/useTableColumnDnd";
import { TablePagination } from "../pagination/TablePagination";
import { TableActionButton } from "../toolbar/TableActionButton";
import { TableCheckbox } from "../toolbar/TableCheckbox";
import { TableToolbar } from "../toolbar/TableToolbar";
import type { TableToolbarLabels } from "../toolbar/TableToolbar";
import { tableFeatures } from "./table-features";
import type { TableColumnDef, TableState } from "./table-features";

const ROW_CONTROLS_ID = "__table_row_controls";
const ROW_ACTIONS_ID = "__table_row_actions";
const DEFAULT_PAGE_SIZES = [10, 20, 30, 50, 100, Infinity];

export interface TableViewFeatures {
  rowControls?: boolean;
  rowSelection?: boolean;
  rowPinning?: boolean;
  cellSelection?: boolean;
  cellSpanning?: boolean;
  columnReordering?: boolean;
  columnPinning?: boolean;
  columnResizing?: boolean;
  columnVisibility?: boolean;
  sorting?: boolean;
  grouping?: boolean;
  globalFilter?: boolean;
  columnFilters?: boolean;
}

export interface TableViewProps<TData extends RowData> {
  data: TData[];
  columns: TableColumnDef<TData>[];
  getRowId: (row: TData, index: number) => string;
  loading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  globalFilterLabel?: string;
  emptyMessage?: string;
  noResultsMessage?: string;
  renderRowActions?: (row: TData) => ReactNode;
  getRowLabel?: (row: TData) => string;
  features?: TableViewFeatures;
  toolbarLabels?: Partial<TableToolbarLabels>;
  pageSizeOptions?: number[];
}

interface PinnedOffsets {
  top: Record<string, number>;
  bottom: Record<string, number>;
}

function sameOffsets(previous: PinnedOffsets, next: PinnedOffsets) {
  return (["top", "bottom"] as const).every((position) => {
    const previousEntries = Object.entries(previous[position]);
    const nextEntries = Object.entries(next[position]);
    return previousEntries.length === nextEntries.length &&
      nextEntries.every(([id, offset]) => previous[position][id] === offset);
  });
}

export function TableView<TData extends RowData>({
  data,
  columns,
  getRowId,
  loading = false,
  error,
  onRefresh,
  globalFilterLabel = "Buscar em todas as colunas",
  emptyMessage = "Nenhum registro disponível.",
  noResultsMessage = "Nenhum registro corresponde aos filtros.",
  renderRowActions,
  getRowLabel,
  features,
  toolbarLabels,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: TableViewProps<TData>) {
  const rowControlsEnabled = features?.rowControls !== false &&
    (features?.rowSelection !== false || features?.rowPinning !== false);
  const rowSelectionEnabled = features?.rowSelection !== false;
  const rowPinningEnabled = features?.rowPinning !== false;
  const cellSelectionEnabled = features?.cellSelection !== false;
  const columnReorderingEnabled = features?.columnReordering !== false;
  const tableColumns = useMemo(() => {
    const columnHelper = createColumnHelper<typeof tableFeatures, TData>();
    const result: TableColumnDef<TData>[] = [];
    if (rowControlsEnabled) {
      result.push(columnHelper.display({
        id: ROW_CONTROLS_ID,
        size: 128,
        minSize: 128,
        maxSize: 128,
        enableSorting: false,
        enableGrouping: false,
        enableHiding: false,
        enableResizing: false,
        enableCellSelection: false,
        enableCellSpanning: false,
        enablePinning: false,
        header: ({ table }) => !rowSelectionEnabled ? "Linhas" : (
          <Subscribe source={table.atoms.rowSelection}>
            {() => (
              <TableCheckbox
                aria-label="Selecionar todas as linhas desta página"
                checked={table.getIsAllPageRowsSelected()}
                indeterminate={table.getIsSomePageRowsSelected()}
                onChange={table.getToggleAllPageRowsSelectedHandler()}
              />
            )}
          </Subscribe>
        ),
        cell: ({ row }) => (
          <Subscribe source={row.table.store} selector={(state) => ({
            rowSelection: state.rowSelection,
            rowPinning: state.rowPinning,
          })}>
            {() => (
              <div className="flex min-h-11 items-center gap-1">
                {rowSelectionEnabled && (
                  <TableCheckbox
                    aria-label={`Selecionar linha ${getRowLabel?.(row.original) ?? row.id}`}
                    checked={row.getIsSelected()}
                    disabled={!row.getCanSelect()}
                    indeterminate={row.getIsSomeSelected()}
                    onChange={row.getToggleSelectedHandler()}
                  />
                )}
                {rowPinningEnabled && (
                  <button
                    type="button"
                    aria-label={`${row.getIsPinned() === "top" ? "Desafixar" : "Fixar"} linha ${getRowLabel?.(row.original) ?? row.id}`}
                    aria-pressed={row.getIsPinned() === "top"}
                    disabled={!row.getCanPin()}
                    onClick={() => row.pin(row.getIsPinned() === "top" ? false : "top")}
                    className="min-h-11 min-w-11 rounded-[var(--radius)] px-2 text-xs text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:opacity-45"
                  >
                    {row.getIsPinned() === "top" ? "Fixada" : "Fixar"}
                  </button>
                )}
              </div>
            )}
          </Subscribe>
        ),
      }));
    }
    result.push(...columns);
    if (renderRowActions) {
      result.push(columnHelper.display({
        id: ROW_ACTIONS_ID,
        header: "Ações",
        size: 180,
        enableSorting: false,
        enableGrouping: false,
        enableHiding: false,
        enableCellSelection: false,
        enableCellSpanning: false,
        cell: ({ row }) => renderRowActions(row.original),
      }));
    }
    return result;
  }, [columns, getRowLabel, renderRowActions, rowControlsEnabled, rowPinningEnabled, rowSelectionEnabled]);

  const cellSelectionAtom = useCreateAtom<CellSelectionState>([]);
  const table = useTable(
    {
      features: tableFeatures,
      atoms: { cellSelection: cellSelectionAtom },
      columns: tableColumns,
      data,
      getRowId,
      enableRowSelection: rowSelectionEnabled,
      enableRowPinning: rowPinningEnabled,
      enableCellSelection: cellSelectionEnabled,
      enableCellSpanning: features?.cellSpanning !== false,
      enableColumnPinning: features?.columnPinning !== false,
      enableColumnResizing: features?.columnResizing !== false,
      enableHiding: features?.columnVisibility !== false,
      enableSorting: features?.sorting !== false,
      enableGrouping: features?.grouping !== false,
      enableGlobalFilter: features?.globalFilter !== false,
      enableColumnFilters: features?.columnFilters !== false,
      globalFilterFn: "fuzzy",
      columnResizeMode: "onChange",
      defaultColumn: { minSize: 120, maxSize: 600 },
      initialState: {
        columnPinning: { start: rowControlsEnabled ? [ROW_CONTROLS_ID] : [], end: [] },
        pagination: { pageIndex: 0, pageSize: 20 },
      },
      keepPinnedRows: true,
      autoResetExpanded: false,
    },
    (state): TableState => ({
      columnFilters: state.columnFilters,
      columnOrder: state.columnOrder,
      columnPinning: state.columnPinning,
      columnResizing: state.columnResizing,
      columnSizing: state.columnSizing,
      columnVisibility: state.columnVisibility,
      expanded: state.expanded,
      globalFilter: state.globalFilter,
      grouping: state.grouping,
      pagination: state.pagination,
      rowPinning: state.rowPinning,
      rowSelection: state.rowSelection,
      sorting: state.sorting,
    }),
  );

  const tableRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const { sensors, handleDragEnd } = useTableColumnDnd(table);
  useTableCellSelectionHotkeys(table, tableRef);

  const topRows = table.getTopRows();
  const centerRows = table.getCenterRows();
  const bottomRows = table.getBottomRows();
  const topRowIds = topRows.map((row) => row.id).join("\u0000");
  const bottomRowIds = bottomRows.map((row) => row.id).join("\u0000");
  const topRowCount = topRows.length;
  const centerRowCount = centerRows.length;
  const bottomRowCount = bottomRows.length;
  const [pinnedOffsets, setPinnedOffsets] = useState<PinnedOffsets>({ top: {}, bottom: {} });

  useEffect(() => {
    const header = theadRef.current;
    const body = tbodyRef.current;
    if (!header || !body) return;

    const measure = () => {
      const next: PinnedOffsets = { top: {}, bottom: {} };
      let topOffset = header.getBoundingClientRect().height;
      const currentTopIds = topRowIds ? topRowIds.split("\u0000") : [];
      const currentBottomIds = bottomRowIds ? bottomRowIds.split("\u0000") : [];
      currentTopIds.forEach((id, index) => {
        next.top[id] = topOffset;
        topOffset += body.children.item(index)?.getBoundingClientRect().height ?? 0;
      });
      let bottomOffset = 0;
      for (let index = currentBottomIds.length - 1; index >= 0; index -= 1) {
        next.bottom[currentBottomIds[index]] = bottomOffset;
        bottomOffset += body.children.item(topRowCount + centerRowCount + index)?.getBoundingClientRect().height ?? 0;
      }
      setPinnedOffsets((previous) => sameOffsets(previous, next) ? previous : next);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(header);
    for (let index = 0; index < topRowCount; index += 1) {
      const element = body.children.item(index);
      if (element) observer.observe(element);
    }
    for (let index = 0; index < bottomRowCount; index += 1) {
      const element = body.children.item(topRowCount + centerRowCount + index);
      if (element) observer.observe(element);
    }
    measure();
    return () => observer.disconnect();
  }, [data, topRowIds, bottomRowIds, topRowCount, centerRowCount, bottomRowCount]);

  const columnSizeVars: Record<string, number> = {};
  for (const header of table.getFlatHeaders()) {
    columnSizeVars[`--header-${header.id}-size`] = header.getSize();
    columnSizeVars[`--col-${header.column.id}-size`] = header.column.getSize();
  }
  const sortableColumns = table.getAllLeafColumns().map((column) => column.id);
  const selectedRowCount = table.getSelectedRowModel().flatRows.length;
  const totalRowCount = table.getCoreRowModel().flatRows.length;
  const noData = data.length === 0;

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <section className="flex min-w-0 flex-col gap-4 text-[var(--foreground)]">
        <TableToolbar
          searchValue={String(table.state.globalFilter ?? "")}
          onSearchChange={(value) => table.setGlobalFilter(String(value))}
          onRefresh={onRefresh}
          isLoading={loading}
          onReset={() => table.reset()}
          selectedRowCount={selectedRowCount}
          totalRowCount={totalRowCount}
          selectedCellCount={
            <Subscribe source={table.atoms.cellSelection}>
              {() => <span>{table.getSelectedCellCount().toLocaleString("pt-BR")} células selecionadas</span>}
            </Subscribe>
          }
          onClearCells={() => table.resetCellSelection(true)}
          onSelectAllCells={() => table.selectAllCells()}
          allColumnsVisible={table.getIsAllColumnsVisible()}
          onToggleAllColumns={table.getToggleAllColumnsVisibilityHandler()}
          columns={table.getAllLeafColumns().map((column) => ({
            id: column.id,
            label: typeof column.columnDef.header === "string" ? column.columnDef.header : column.id,
            checked: column.getIsVisible(),
            disabled: !column.getCanHide(),
            onChange: column.getToggleVisibilityHandler(),
          }))}
          labels={{ ...toolbarLabels, search: toolbarLabels?.search ?? globalFilterLabel, searchPlaceholder: toolbarLabels?.searchPlaceholder ?? globalFilterLabel }}
        />

        {loading && <p role="status" className="rounded-xl border border-[var(--border)] bg-[var(--accent)] p-3 text-sm text-[var(--accent-foreground)]">Carregando registros…</p>}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]">
            <span>{error}</span>
            <TableActionButton onClick={onRefresh}>Tentar novamente</TableActionButton>
          </div>
        )}
        {!loading && !error && noData && <p className="rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] p-3 text-sm text-[var(--muted)]">{emptyMessage}</p>}

        <div
          ref={tableRef}
          tabIndex={cellSelectionEnabled ? 0 : undefined}
          aria-label={cellSelectionEnabled ? "Tabela; use as setas para navegar pelas células" : "Tabela de dados"}
          className="max-w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <table style={{ ...columnSizeVars, width: table.getTotalSize() } as CSSProperties} className="border-separate border-spacing-0 text-left">
            <thead ref={theadRef} className="sticky top-0 z-10 bg-[var(--card-secondary)]">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  <SortableContext items={sortableColumns} strategy={horizontalListSortingStrategy}>
                    {group.headers.map((header) => (
                      <TableHeader
                        key={header.id}
                        header={header}
                        table={table}
                        columnLabel={typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : header.column.id}
                        canReorder={columnReorderingEnabled && header.column.id !== ROW_CONTROLS_ID && header.column.id !== ROW_ACTIONS_ID}
                      />
                    ))}
                  </SortableContext>
                </tr>
              ))}
            </thead>
            <tbody ref={tbodyRef}>
              {topRows.map((row) => <TablePinnedRow key={row.id} row={row} table={table} topOffset={pinnedOffsets.top[row.id]} />)}
              {centerRows.map((row) => (
                <Subscribe
                  key={row.id}
                  source={table.atoms.cellSelection}
                  selector={(ranges) => rowSelectionKey(ranges, table.getCellSelectionBounds(), row.getDisplayIndex(), row.id)}
                >
                  {() => (
                    <tr>
                      {row.getVisibleCells().map((cell) => (
                        <SortableContext key={cell.id} items={sortableColumns} strategy={horizontalListSortingStrategy}>
                          <TableCell cell={cell} table={table} />
                        </SortableContext>
                      ))}
                    </tr>
                  )}
                </Subscribe>
              ))}
              {bottomRows.map((row) => <TablePinnedRow key={row.id} row={row} table={table} bottomOffset={pinnedOffsets.bottom[row.id]} />)}
              {!loading && !error && !noData && table.getRowModel().rows.length === 0 && (
                <tr><td colSpan={Math.max(1, table.getVisibleLeafColumns().length)} className="p-8 text-center text-sm text-[var(--muted)]">{noResultsMessage}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={table.state.pagination.pageIndex + 1}
          pageCount={Math.max(1, table.getPageCount())}
          canGoToPreviousPage={table.getCanPreviousPage()}
          canGoToNextPage={table.getCanNextPage()}
          canGoToLastPage={table.getCanLastPage()}
          onFirstPage={() => table.setPageIndex(0)}
          onPreviousPage={() => table.previousPage()}
          onNextPage={() => table.nextPage()}
          onLastPage={() => table.lastPage()}
          onGoToPage={(page) => table.setPageIndex(page - 1)}
          pageSize={table.state.pagination.pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={(pageSize) => table.setPageSize(pageSize)}
          rowsOnPage={table.getRowModel().rows.length}
          filteredRowCount={table.getFilteredRowModel().rows.length}
          totalRowCount={totalRowCount}
        />
      </section>
    </DndContext>
  );
}
