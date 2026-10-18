"use client";

import { Subscribe } from "@tanstack/react-table";
import type { Header, ReactTable } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { RowData } from "@tanstack/react-table";
import { TableColumnOptionsDialog } from "../dialogs/TableColumnOptionsDialog";
import { TableColumnFilter } from "../filters/TableColumnFilter";
import { tableFeatures } from "../core/table-features";
import type { TableState } from "../core/table-features";
import { getColumnPinningStyles } from "./tablePinningStyles";
import { DEFAULT_COLUMN_PRESENTATION } from "../core/tableColumnPresentation";
import type { TableColumnPresentation } from "../core/tableColumnPresentation";
import { tableButtonMotion, tableIconMotion } from "../core/tableMotion";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

export function TableHeader<TData extends RowData>({
  header,
  table,
  columnLabel,
  canReorder = true,
  resetKey,
  columnSizes,
  columnPresentation,
  onColumnPresentationChange,
}: {
  header: Header<typeof tableFeatures, TData, unknown>;
  table: TableInstance<TData>;
  columnLabel: string;
  canReorder?: boolean;
  resetKey?: number;
  columnSizes: Record<string, number>;
  columnPresentation?: TableColumnPresentation;
  onColumnPresentationChange: (presentation: TableColumnPresentation) => void;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useSortable({
    id: header.column.id,
    disabled: !canReorder,
  });
  const column = header.column;
  const [optionsOpen, setOptionsOpen] = useState(false);
  useSelector(table.atoms.columnSizing, (sizing) => sizing[column.id]);
  const minSize = column.columnDef.minSize ?? table.getDefaultColumnDef().minSize ?? 20;
  const maxSize = column.columnDef.maxSize ?? table.getDefaultColumnDef().maxSize ?? Number.MAX_SAFE_INTEGER;
  const hasColumnOptions = canReorder || column.getCanPin() || column.getCanGroup() || column.getCanResize();
  const displaySize = columnSizes[column.id] ?? column.getSize();
  const pinningStyles = getColumnPinningStyles(column, table, columnSizes);
  const style: CSSProperties = {
    ...pinningStyles,
    background: undefined,
    opacity: isDragging ? 0.75 : 1,
    transform: CSS.Translate.toString(transform),
    transition: "width transform 0.2s ease",
    whiteSpace: "nowrap",
    width: `calc(var(--header-${header.id}-size) * 1px)`,
    zIndex: isDragging ? 3 : pinningStyles.zIndex,
  };

  return (
    <Subscribe source={table.store} selector={(state) => ({ grouping: state.grouping })}>
      {() => (
        <th
          ref={setNodeRef}
          style={style}
          colSpan={header.colSpan}
          aria-sort={
            header.isPlaceholder || !column.getIsSorted()
              ? undefined
              : column.getIsSorted() === "asc"
                ? "ascending"
                : "descending"
          }
          className="relative border-b border-r border-[var(--border)] bg-[var(--table-header-bg)] p-3 text-left align-top text-xs font-semibold uppercase tracking-wide text-[var(--table-header-fg)]"
        >
          {header.isPlaceholder ? null : (
            <div className="min-w-32">
              <div className="flex min-h-11 items-center gap-1 text-[var(--table-header-fg)]">
                {canReorder && (
                  <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    aria-label={`Reordenar coluna ${columnLabel}`}
                    title="Arraste para reordenar"
                    className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] text-[var(--table-header-fg)] hover:bg-[var(--accent)] active:cursor-grabbing"
                  >
                    <span className="material-icons text-base" aria-hidden="true">drag_indicator</span>
                  </button>
                )}
                {column.getCanSort() ? (
                  <button
                    type="button"
                    aria-label={`Ordenar por ${columnLabel}`}
                    title={column.getIsSorted() === "asc" ? "Ordem crescente" : column.getIsSorted() === "desc" ? "Ordem decrescente" : "Ordenar alfabeticamente"}
                    onClick={column.getToggleSortingHandler()}
                    className={`group min-h-11 min-w-0 cursor-pointer flex-1 text-left hover:text-[var(--color-brand-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${tableButtonMotion}`}
                  >
                    <table.FlexRender header={header} />
                    {column.getIsSorted() && (
                      <span className={`material-icons ml-1 align-middle text-base ${tableIconMotion} ${column.getIsSorted() === "desc" ? "rotate-180" : ""}`} aria-hidden="true">
                        arrow_upward
                      </span>
                    )}
                  </button>
                ) : (
                  <table.FlexRender header={header} />
                )}
                {hasColumnOptions && (
                  <button
                    type="button"
                    aria-label={`Opções da coluna ${columnLabel}`}
                    aria-haspopup="dialog"
                    aria-expanded={optionsOpen}
                    onClick={() => setOptionsOpen(true)}
                    className={`group inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] text-[var(--table-header-fg)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${tableButtonMotion}`}
                  >
                    <span className={`material-icons text-base group-hover:rotate-45 motion-reduce:group-hover:rotate-0 ${tableIconMotion}`} aria-hidden="true">settings</span>
                  </button>
                )}
              </div>
              {column.getCanFilter() && <TableColumnFilter column={column} columnLabel={columnLabel} resetKey={resetKey} />}
            </div>
          )}
          {hasColumnOptions && (
            <TableColumnOptionsDialog
              open={optionsOpen}
              onClose={() => setOptionsOpen(false)}
              column={column}
              table={table}
              columnLabel={columnLabel}
              displaySize={displaySize}
              columnPresentation={columnPresentation ?? DEFAULT_COLUMN_PRESENTATION}
              onColumnPresentationChange={onColumnPresentationChange}
              minSize={minSize}
              maxSize={maxSize}
            />
          )}
        </th>
      )}
    </Subscribe>
  );
}
