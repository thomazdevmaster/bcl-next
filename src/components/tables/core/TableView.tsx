"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { Subscribe, createColumnHelper, useTable } from "@tanstack/react-table";
import type { CellSelectionState, ReactTable, RowData } from "@tanstack/react-table";
import { useCreateAtom } from "@tanstack/react-store";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { MusicLoader } from "@/components/MusicLoader";
import { TableCell } from "../cells/TableCell";
import { TableAnimatedRow } from "../cells/TableAnimatedRow";
import { tableButtonMotion, tableIconMotion } from "./tableMotion";
import { TablePinnedRow, rowSelectionKey } from "../cells/TablePinnedRows";
import { useTableCellSelectionHotkeys } from "../cells/useTableCellSelectionHotkeys";
import { TableHeader } from "../columns/TableHeader";
import { useTableColumnDnd } from "../columns/useTableColumnDnd";
import { TablePagination } from "../pagination/TablePagination";
import { TableActionButton } from "../toolbar/TableActionButton";
import { TableSelectionToolbar } from "../toolbar/TableSelectionToolbar";
import { TableCheckbox } from "../toolbar/TableCheckbox";
import { TableMobileCards } from "./TableMobileCards";
import type { MobileTableAction } from "./table-actions";
import { TableToolbar } from "../toolbar/TableToolbar";
import type { TableToolbarLabels } from "../toolbar/TableToolbar";
import { TableResetConfirmationDialog } from "../dialogs/TableResetConfirmationDialog";
import { tableFeatures } from "./table-features";
import { getExpandedColumnSizes } from "./tableColumnSizing";
import type { TableColumnPresentation } from "./tableColumnPresentation";
import type { TableColumnDef, TableState } from "./table-features";

const ROW_CONTROLS_ID = "__table_row_controls";
const ROW_ACTIONS_ID = "__table_row_actions";
const DEFAULT_PAGE_SIZES = [10, 20, 30, 50, 100, Infinity];
const TABLE_PREFERENCES_VERSION = 1;

interface PersistedTablePreferences {
  version: typeof TABLE_PREFERENCES_VERSION;
  columnPresentations: Record<string, TableColumnPresentation>;
  columnOrder: string[];
  columnPinning: TableState["columnPinning"];
  columnSizing: TableState["columnSizing"];
  columnVisibility: TableState["columnVisibility"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isColumnPresentation(value: unknown): value is TableColumnPresentation {
  if (!isRecord(value)) return false;
  return (
    (value.alignment === "left" || value.alignment === "center" || value.alignment === "right") &&
    (value.verticalAlignment === "top" ||
      value.verticalAlignment === "middle" ||
      value.verticalAlignment === "bottom") &&
    (value.textTransform === "none" || value.textTransform === "uppercase" || value.textTransform === "lowercase") &&
    typeof value.bold === "boolean" &&
    typeof value.italic === "boolean" &&
    typeof value.underline === "boolean" &&
    typeof value.strikethrough === "boolean" &&
    (typeof value.textColor === "string" || value.textColor === null) &&
    (typeof value.cellColor === "string" || value.cellColor === null)
  );
}

function parseTablePreferences(value: unknown): PersistedTablePreferences | null {
  if (!isRecord(value) || value.version !== TABLE_PREFERENCES_VERSION) return null;
  if (!Array.isArray(value.columnOrder) || !value.columnOrder.every((id) => typeof id === "string")) return null;
  if (!isRecord(value.columnPresentations) || !Object.values(value.columnPresentations).every(isColumnPresentation))
    return null;
  if (
    !isRecord(value.columnPinning) ||
    !Array.isArray(value.columnPinning.start) ||
    !value.columnPinning.start.every((id) => typeof id === "string")
  )
    return null;
  if (!Array.isArray(value.columnPinning.end) || !value.columnPinning.end.every((id) => typeof id === "string"))
    return null;
  if (
    !isRecord(value.columnSizing) ||
    !Object.values(value.columnSizing).every((size) => typeof size === "number" && Number.isFinite(size))
  )
    return null;
  if (
    !isRecord(value.columnVisibility) ||
    !Object.values(value.columnVisibility).every((visible) => typeof visible === "boolean")
  )
    return null;

  return value as unknown as PersistedTablePreferences;
}

function serializeTablePreferences(
  state: TableState,
  columnPresentations: Record<string, TableColumnPresentation>,
): string {
  const preferences: PersistedTablePreferences = {
    version: TABLE_PREFERENCES_VERSION,
    columnPresentations,
    columnOrder: state.columnOrder,
    columnPinning: state.columnPinning,
    columnSizing: state.columnSizing,
    columnVisibility: state.columnVisibility,
  };
  return JSON.stringify(preferences);
}

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
  tableId: string;
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
  /** Ícone ou badge ao lado do título no card mobile (≤959px). */
  renderMobileCardHeaderExtra?: (row: TData) => ReactNode;
  renderMobileRowActions?: (row: TData) => MobileTableAction[];
  getRowLabel?: (row: TData) => string;
  mobilePrimaryLabel?: string;
  getMobilePrimary?: (row: TData) => ReactNode;
  getMobilePrimaryLabel?: (row: TData) => ReactNode;
  features?: TableViewFeatures;
  toolbarLabels?: Partial<TableToolbarLabels>;
  pageSizeOptions?: number[];
  mobilePrimaryAction?: ReactNode;
  mobileSelectionEnabled?: boolean;
  canSelectRow?: (row: TData) => boolean;
  onDeleteSelected?: (rows: TData[], clearSelection: () => void) => void;
}

interface PinnedOffsets {
  top: Record<string, number>;
  bottom: Record<string, number>;
}

function sameOffsets(previous: PinnedOffsets, next: PinnedOffsets) {
  return (["top", "bottom"] as const).every((position) => {
    const previousEntries = Object.entries(previous[position]);
    const nextEntries = Object.entries(next[position]);
    return (
      previousEntries.length === nextEntries.length &&
      nextEntries.every(([id, offset]) => previous[position][id] === offset)
    );
  });
}

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

function CellSelectionHotkeys<TData extends RowData>({
  table,
  target,
}: {
  table: TableInstance<TData>;
  target: RefObject<HTMLDivElement | null>;
}) {
  useTableCellSelectionHotkeys(table, target);
  return null;
}

export function TableView<TData extends RowData>({
  tableId,
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
  renderMobileCardHeaderExtra,
  renderMobileRowActions,
  getRowLabel,
  mobilePrimaryLabel,
  getMobilePrimary,
  getMobilePrimaryLabel,
  features,
  toolbarLabels,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  mobilePrimaryAction,
  mobileSelectionEnabled = false,
  canSelectRow,
  onDeleteSelected,
}: TableViewProps<TData>) {
  const rowControlsEnabled =
    features?.rowControls !== false && (features?.rowSelection !== false || features?.rowPinning !== false);
  const rowSelectionEnabled = features?.rowSelection !== false;
  const rowPinningEnabled = features?.rowPinning !== false;
  // Cell selection remains available as an opt-in feature, but is off by default.
  const cellSelectionEnabled = features?.cellSelection === true;
  const columnReorderingEnabled = features?.columnReordering !== false;
  const globalFilterEnabled = features?.globalFilter !== false;
  const columnVisibilityEnabled = features?.columnVisibility !== false;
  const tableColumns = useMemo(() => {
    const columnHelper = createColumnHelper<typeof tableFeatures, TData>();
    const result: TableColumnDef<TData>[] = [];
    if (rowControlsEnabled) {
      result.push(
        columnHelper.display({
          id: ROW_CONTROLS_ID,
          size: rowSelectionEnabled && rowPinningEnabled ? 96 : 56,
          minSize: rowSelectionEnabled && rowPinningEnabled ? 96 : 56,
          maxSize: rowSelectionEnabled && rowPinningEnabled ? 96 : 56,
          enableSorting: false,
          enableGrouping: false,
          enableHiding: false,
          enableResizing: false,
          enableCellSelection: false,
          enableCellSpanning: false,
          enablePinning: false,
          header: ({ table }) =>
            !rowSelectionEnabled ? (
              "Linhas"
            ) : (
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
            <Subscribe
              source={row.table.store}
              selector={(state) => ({
                rowSelection: state.rowSelection,
                rowPinning: state.rowPinning,
              })}
            >
              {() => (
                <div className="flex min-h-11 items-center gap-1">
                  {rowSelectionEnabled && (
                    <TableCheckbox
                      aria-label={`Selecionar linha ${getRowLabel?.(row.original) ?? row.id}`}
                      checked={row.getIsSelected()}
                      disabled={!row.getCanSelect()}
                      indeterminate={row.getIsSomeSelected()}
                      onChange={row.getToggleSelectedHandler()}
                      hideOnMobile
                    />
                  )}
                  {rowPinningEnabled && (
                    <button
                      type="button"
                      aria-label={`${row.getIsPinned() === "top" ? "Desafixar" : "Fixar"} linha ${getRowLabel?.(row.original) ?? row.id}`}
                      aria-pressed={row.getIsPinned() === "top"}
                      disabled={!row.getCanPin()}
                      onClick={() => row.pin(row.getIsPinned() === "top" ? false : "top")}
                      title={row.getIsPinned() === "top" ? "Desafixar linha" : "Fixar linha"}
                      className={`group inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[var(--radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-65 max-[959px]:hidden ${tableButtonMotion} ${row.getIsPinned() === "top" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--info)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"}`}
                    >
                      <span className={`material-icons text-base ${tableIconMotion}`} aria-hidden="true">
                        push_pin
                      </span>
                    </button>
                  )}
                </div>
              )}
            </Subscribe>
          ),
        }),
      );
    }
    result.push(...columns);
    if (renderRowActions) {
      result.push(
        columnHelper.display({
          id: ROW_ACTIONS_ID,
          header: "Ações",
          size: 180,
          enableSorting: false,
          enableGrouping: false,
          enableHiding: false,
          enableCellSelection: false,
          enableCellSpanning: false,
          cell: ({ row }) => (row.getIsGrouped() ? null : renderRowActions(row.original)),
        }),
      );
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
      enableRowSelection: rowSelectionEnabled ? (row) => canSelectRow?.(row.original) ?? true : false,
      enableRowPinning: rowPinningEnabled,
      enableCellSelection: cellSelectionEnabled,
      enableCellSpanning: features?.cellSpanning !== false,
      enableColumnPinning: features?.columnPinning !== false,
      enableColumnResizing: features?.columnResizing !== false,
      enableHiding: columnVisibilityEnabled,
      enableSorting: features?.sorting !== false,
      enableGrouping: features?.grouping !== false,
      enableGlobalFilter: globalFilterEnabled,
      enableColumnFilters: features?.columnFilters !== false,
      globalFilterFn: "fuzzy",
      columnResizeMode: "onChange",
      defaultColumn: { minSize: 120, maxSize: 600, sortFn: "ptBR" },
      initialState: {
        columnPinning: {
          start: rowControlsEnabled ? [ROW_CONTROLS_ID] : [],
          end: [],
        },
        pagination: { pageIndex: 0, pageSize: 10 },
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
  const [mobileSelectionMode, setMobileSelectionMode] = useState(false);
  const { sensors, handleDragEnd } = useTableColumnDnd(table);

  const topRows = table.getTopRows();
  const centerRows = table.getCenterRows();
  const bottomRows = table.getBottomRows();
  const topRowIds = topRows.map((row) => row.id).join("\u0000");
  const bottomRowIds = bottomRows.map((row) => row.id).join("\u0000");
  const topRowCount = topRows.length;
  const centerRowCount = centerRows.length;
  const bottomRowCount = bottomRows.length;
  const [pinnedOffsets, setPinnedOffsets] = useState<PinnedOffsets>({
    top: {},
    bottom: {},
  });
  const [resetKey, setResetKey] = useState(0);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [availableTableWidth, setAvailableTableWidth] = useState(0);
  const [columnPresentations, setColumnPresentations] = useState<Record<string, TableColumnPresentation>>({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const preferencesTableRef = useRef(table);
  const persistenceSnapshotRef = useRef<string | null>(null);
  const loadedPreferencesTableRef = useRef<string | null>(null);
  const skipPreferencesPersistenceRef = useRef(false);
  const preferencesStorageKey = `bcl:table-preferences:v${TABLE_PREFERENCES_VERSION}:${tableId}`;

  useEffect(() => {
    const preferencesTable = preferencesTableRef.current;
    const knownColumnIds = preferencesTable.getAllLeafColumns().map((column) => column.id);
    const knownColumnIdSet = new Set(knownColumnIds);
    persistenceSnapshotRef.current = serializeTablePreferences(preferencesTable.state, {});

    let storedPreferences: PersistedTablePreferences | null = null;
    try {
      const serialized = window.localStorage.getItem(preferencesStorageKey);
      if (serialized) {
        storedPreferences = parseTablePreferences(JSON.parse(serialized) as unknown);
        if (!storedPreferences) window.localStorage.removeItem(preferencesStorageKey);
      }
    } catch {
      try {
        window.localStorage.removeItem(preferencesStorageKey);
      } catch {
        // Storage can be unavailable in private browsing or restricted contexts.
      }
    }

    if (storedPreferences) {
      const columnOrder =
        storedPreferences.columnOrder.length === 0
          ? []
          : [
              ...storedPreferences.columnOrder.filter((id) => knownColumnIdSet.has(id)),
              ...knownColumnIds.filter((id) => !storedPreferences.columnOrder.includes(id)),
            ];
      const columnPinning: TableState["columnPinning"] = {
        start: storedPreferences.columnPinning.start.filter((id) => knownColumnIdSet.has(id)),
        end: storedPreferences.columnPinning.end.filter((id) => knownColumnIdSet.has(id)),
      };
      const columnSizing = Object.fromEntries(
        Object.entries(storedPreferences.columnSizing).filter(
          ([id]) => id !== ROW_CONTROLS_ID && knownColumnIdSet.has(id),
        ),
      );
      const columnVisibility = Object.fromEntries(
        Object.entries(storedPreferences.columnVisibility).filter(([id]) => knownColumnIdSet.has(id)),
      );
      const savedPresentations = Object.fromEntries(
        Object.entries(storedPreferences.columnPresentations).filter(([id]) => knownColumnIdSet.has(id)),
      );
      const restoredPreferences: PersistedTablePreferences = {
        version: TABLE_PREFERENCES_VERSION,
        columnPresentations: savedPresentations,
        columnOrder,
        columnPinning,
        columnSizing,
        columnVisibility,
      };

      preferencesTable.setColumnOrder(columnOrder);
      preferencesTable.setColumnPinning(columnPinning);
      preferencesTable.setColumnSizing(columnSizing);
      preferencesTable.setColumnVisibility(columnVisibility);
      persistenceSnapshotRef.current = JSON.stringify(restoredPreferences);
    }

    let isCurrent = true;
    queueMicrotask(() => {
      if (!isCurrent) return;
      loadedPreferencesTableRef.current = tableId;
      if (storedPreferences) {
        setColumnPresentations(storedPreferences.columnPresentations);
      } else {
        setColumnPresentations((current) => (Object.keys(current).length === 0 ? current : {}));
      }
      setPreferencesLoaded(true);
    });
    return () => {
      isCurrent = false;
    };
  }, [preferencesStorageKey, tableId]);

  useEffect(() => {
    if (!preferencesLoaded || loadedPreferencesTableRef.current !== tableId) return;

    const serialized = serializeTablePreferences(table.state, columnPresentations);
    if (skipPreferencesPersistenceRef.current) {
      skipPreferencesPersistenceRef.current = false;
      persistenceSnapshotRef.current = serialized;
      return;
    }
    if (serialized === persistenceSnapshotRef.current) return;

    try {
      window.localStorage.setItem(preferencesStorageKey, serialized);
      persistenceSnapshotRef.current = serialized;
    } catch {
      // Keep the table usable if browser storage is unavailable or full.
    }
  }, [
    columnPresentations,
    preferencesLoaded,
    preferencesStorageKey,
    resetKey,
    table,
    table.state.columnOrder,
    table.state.columnPinning,
    table.state.columnSizing,
    table.state.columnVisibility,
    tableId,
  ]);

  useEffect(() => {
    const container = tableRef.current;
    if (!container) return;

    const measure = () => setAvailableTableWidth(container.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
      setPinnedOffsets((previous) => (sameOffsets(previous, next) ? previous : next));
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

  const visibleColumns = table.getVisibleLeafColumns();
  const columnSizes = getExpandedColumnSizes(
    visibleColumns.map((column) => ({
      id: column.id,
      size: column.getSize(),
      maxSize: column.columnDef.maxSize ?? table.getDefaultColumnDef().maxSize ?? Number.MAX_SAFE_INTEGER,
      canResize: column.getCanResize(),
      manuallySized: Object.prototype.hasOwnProperty.call(table.state.columnSizing, column.id),
    })),
    availableTableWidth,
  );
  const totalColumnSize = visibleColumns.reduce(
    (total, column) => total + (columnSizes[column.id] ?? column.getSize()),
    0,
  );
  const columnSizeVars: Record<string, number> = {};
  for (const header of table.getFlatHeaders()) {
    const headerSize = header
      .getLeafHeaders()
      .reduce((total, leafHeader) => total + (columnSizes[leafHeader.column.id] ?? leafHeader.column.getSize()), 0);
    columnSizeVars[`--header-${header.id}-size`] = headerSize;
    columnSizeVars[`--col-${header.column.id}-size`] = columnSizes[header.column.id] ?? header.column.getSize();
  }
  const sortableColumns = table.getAllLeafColumns().map((column) => column.id);
  const totalRowCount = table.getCoreRowModel().flatRows.length;
  const selectedRows = table.getSelectedRowModel().flatRows;
  const selectedRowCount = selectedRows.length;
  const selectionToolbarEnabled = mobileSelectionEnabled && rowSelectionEnabled && Boolean(onDeleteSelected);
  const selectionToolbarVisible = selectionToolbarEnabled && (mobileSelectionMode || selectedRowCount > 0);
  const selectableFilteredRows = table.getFilteredRowModel().flatRows.filter((row) => row.getCanSelect());
  const allFilteredRowsSelected =
    selectableFilteredRows.length > 0 && selectableFilteredRows.every((row) => row.getIsSelected());
  const noData = data.length === 0;

  return (
    <section className="flex min-w-0 flex-col gap-4 text-[var(--foreground)]">
      {cellSelectionEnabled && <CellSelectionHotkeys table={table} target={tableRef} />}
      <TableToolbar
        searchValue={String(table.state.globalFilter ?? "")}
        onSearchChange={(value) => {
          table.setGlobalFilter(String(value));
          table.setPageIndex(0);
        }}
        resetKey={resetKey}
        onRefresh={onRefresh}
        isLoading={loading}
        onReset={() => setResetConfirmationOpen(true)}
        selectedRowCount={selectedRowCount}
        totalRowCount={totalRowCount}
        onClearRows={() => {
          table.resetRowSelection(true);
          setMobileSelectionMode(false);
        }}
        onSelectAllRows={() => table.toggleAllRowsSelected(true)}
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
        searchLabel={globalFilterLabel}
        labels={toolbarLabels}
        globalFilterEnabled={globalFilterEnabled}
        rowSelectionEnabled={rowSelectionEnabled}
        cellSelectionEnabled={cellSelectionEnabled}
        columnVisibilityEnabled={columnVisibilityEnabled}
        mobilePrimaryAction={mobilePrimaryAction}
      />
      <TableResetConfirmationDialog
        open={resetConfirmationOpen}
        onClose={() => setResetConfirmationOpen(false)}
        onConfirm={() => {
          skipPreferencesPersistenceRef.current = true;
          try {
            window.localStorage.removeItem(preferencesStorageKey);
          } catch {
            // Resetting table state still works when browser storage is unavailable.
          }
          setResetKey((current) => current + 1);
          table.reset();
          setColumnPresentations({});
          if (cellSelectionEnabled) table.resetCellSelection(true);
        }}
      />
      {loading && (
        <MusicLoader
          label="Carregando registros…"
          className="rounded-xl border border-[var(--border)] bg-[var(--accent)]"
        />
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 p-3 text-sm text-[var(--destructive)]"
        >
          <span>{error}</span>
          <TableActionButton onClick={onRefresh}>Tentar novamente</TableActionButton>
        </div>
      )}
      {!loading && !error && noData && (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] p-3 text-sm text-[var(--muted)]">
          {emptyMessage}
        </p>
      )}

      <div className="hidden flex-col gap-2 max-[959px]:flex">
        {selectionToolbarEnabled && onDeleteSelected ? (
          <div
            aria-hidden={!selectionToolbarVisible}
            inert={!selectionToolbarVisible}
            className={`grid transition-[grid-template-rows] duration-150 ease-out motion-reduce:transition-none ${selectionToolbarVisible ? "grid-rows-[1fr]" : "-my-1 grid-rows-[0fr]"}`}
          >
            <div className="min-h-0 overflow-hidden">
              <TableSelectionToolbar
                visible={selectionToolbarVisible}
                selectedCount={selectedRowCount}
                totalCount={totalRowCount}
                allSelected={allFilteredRowsSelected}
                onToggleAll={() => {
                  if (allFilteredRowsSelected) {
                    table.resetRowSelection(true);
                    setMobileSelectionMode(false);
                    return;
                  }
                  const next = { ...table.atoms.rowSelection.get() };
                  selectableFilteredRows.forEach((row) => (next[row.id] = true));
                  table.setRowSelection(next);
                }}
                onDelete={() =>
                  onDeleteSelected(
                    selectedRows.map((row) => row.original),
                    () => {
                      table.resetRowSelection(true);
                      setMobileSelectionMode(false);
                    },
                  )
                }
              />
            </div>
          </div>
        ) : null}
        <TableMobileCards
          table={table}
          rows={[...topRows, ...centerRows, ...bottomRows]}
          noResults={!loading && !error && !noData && table.getFilteredRowModel().rows.length === 0}
          noResultsMessage={noResultsMessage}
          renderHeaderExtra={
            renderMobileCardHeaderExtra ? (row) => renderMobileCardHeaderExtra(row.original) : undefined
          }
          getRowLabel={getRowLabel}
          getMobilePrimary={getMobilePrimary}
          getMobilePrimaryLabel={getMobilePrimaryLabel}
          mobilePrimaryLabel={mobilePrimaryLabel}
          renderRowActions={renderMobileRowActions}
          rowPinningEnabled={rowPinningEnabled}
          mobileSelectionEnabled={mobileSelectionEnabled && rowSelectionEnabled}
          selectionMode={mobileSelectionMode}
          onSelectionModeChange={setMobileSelectionMode}
          selectedRowCount={selectedRowCount}
        />
      </div>

      <div
        ref={tableRef}
        tabIndex={cellSelectionEnabled ? 0 : undefined}
        aria-label={cellSelectionEnabled ? "Tabela; use as setas para navegar pelas células" : "Tabela de dados"}
        className="max-w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] max-[959px]:hidden"
      >
        <table
          style={{ ...columnSizeVars, width: totalColumnSize } as CSSProperties}
          className="border-separate border-spacing-0 text-left"
        >
          {/* Only headers participate in this drag context. TableCell uses the same column ids for display. */}
          <DndContext
            accessibility={{
              container: typeof document === "undefined" ? undefined : document.body,
            }}
            collisionDetection={closestCenter}
            modifiers={[restrictToHorizontalAxis]}
            onDragEnd={handleDragEnd}
            sensors={columnReorderingEnabled ? sensors : []}
          >
            <thead ref={theadRef} className="sticky top-0 z-10 bg-[var(--card-secondary)]">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  <SortableContext items={sortableColumns} strategy={horizontalListSortingStrategy}>
                    {group.headers.map((header) => (
                      <TableHeader
                        key={header.id}
                        header={header}
                        table={table}
                        columnLabel={
                          typeof header.column.columnDef.header === "string"
                            ? header.column.columnDef.header
                            : header.column.id
                        }
                        canReorder={
                          columnReorderingEnabled &&
                          header.column.id !== ROW_CONTROLS_ID &&
                          header.column.id !== ROW_ACTIONS_ID
                        }
                        resetKey={resetKey}
                        columnSizes={columnSizes}
                        columnPresentation={columnPresentations[header.column.id]}
                        compact={header.column.id === ROW_CONTROLS_ID}
                        onColumnPresentationChange={(presentation) => {
                          setColumnPresentations((current) => ({
                            ...current,
                            [header.column.id]: presentation,
                          }));
                        }}
                      />
                    ))}
                  </SortableContext>
                </tr>
              ))}
            </thead>
          </DndContext>
          <tbody ref={tbodyRef}>
            {topRows.map((row) => (
              <TablePinnedRow
                key={row.id}
                row={row}
                table={table}
                topOffset={pinnedOffsets.top[row.id]}
                columnSizes={columnSizes}
                columnPresentations={columnPresentations}
              />
            ))}
            {centerRows.map((row) => (
              <Subscribe
                key={row.id}
                source={table.atoms.cellSelection}
                selector={(ranges) =>
                  rowSelectionKey(ranges, table.getCellSelectionBounds(), row.getDisplayIndex(), row.id)
                }
              >
                {() => (
                  <TableAnimatedRow index={row.getDisplayIndex()}>
                    {row.getVisibleCells().map((cell) => (
                      <SortableContext key={cell.id} items={sortableColumns} strategy={horizontalListSortingStrategy}>
                        <TableCell
                          cell={cell}
                          table={table}
                          columnSizes={columnSizes}
                          columnPresentations={columnPresentations}
                        />
                      </SortableContext>
                    ))}
                  </TableAnimatedRow>
                )}
              </Subscribe>
            ))}
            {bottomRows.map((row) => (
              <TablePinnedRow
                key={row.id}
                row={row}
                table={table}
                bottomOffset={pinnedOffsets.bottom[row.id]}
                columnSizes={columnSizes}
                columnPresentations={columnPresentations}
              />
            ))}
            {!loading && !error && !noData && table.getFilteredRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
                  className="p-8 text-center text-sm text-[var(--muted)]"
                >
                  {noResultsMessage}
                </td>
              </tr>
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
  );
}
