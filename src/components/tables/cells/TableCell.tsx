"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Cell, ReactTable } from "@tanstack/react-table";
import type { CSSProperties } from "react";
import type { RowData } from "@tanstack/react-table";
import { getColumnPinningStyles } from "../columns/tablePinningStyles";
import { DEFAULT_COLUMN_PRESENTATION, getColumnPresentationClasses } from "../core/tableColumnPresentation";
import type { TableColumnPresentation } from "../core/tableColumnPresentation";
import { tableFeatures } from "../core/table-features";
import type { TableState } from "../core/table-features";
import { tableButtonMotion, tableIconMotion, tableSortableMotion } from "../core/tableMotion";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;
type TableCellStyle = CSSProperties & { "--table-cell-color"?: string };

export function TableCell<TData extends RowData>({
  cell,
  table,
  columnSizes,
  columnPresentations,
}: {
  cell: Cell<typeof tableFeatures, TData, unknown>;
  table: TableInstance<TData>;
  columnSizes: Record<string, number>;
  columnPresentations: Record<string, TableColumnPresentation>;
}) {
  const { isDragging, setNodeRef, transform } = useSortable({ id: cell.column.id });
  const rowSpan = cell.getRowSpan();
  const colSpan = cell.getColSpan();
  if (rowSpan === 0 || colSpan === 0) return null;

  const presentation = columnPresentations[cell.column.id] ?? DEFAULT_COLUMN_PRESENTATION;
  const isHighlighted = cell.getIsSelected() || cell.row.getIsSelected();
  const style: TableCellStyle = {
    ...getColumnPinningStyles(cell.column, table, columnSizes),
    opacity: isDragging ? 0.75 : 1,
    transform: CSS.Translate.toString(transform),
    width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
    background: undefined,
    color: presentation.textColor ?? undefined,
    "--table-cell-color": presentation.cellColor ?? undefined,
  };
  const groupedClass = cell.getIsGrouped() ? "font-semibold" : cell.getIsAggregated() ? "italic" : "";
  const presentationClasses = getColumnPresentationClasses(presentation);
  const backgroundClass = isHighlighted
    ? "bg-[var(--accent)]"
    : presentation.cellColor
      ? "bg-[var(--table-cell-color)]"
      : cell.getIsGrouped() || cell.getIsAggregated()
        ? "bg-[var(--card-secondary)]"
        : cell.row.getDisplayIndex() % 2 === 0
          ? "bg-[var(--card)]"
          : "bg-[var(--card-secondary)]";

  return (
    <td
      ref={setNodeRef}
      style={style}
      rowSpan={rowSpan}
      colSpan={colSpan}
      tabIndex={cell.getCanSelect() ? cell.getTabIndex() : undefined}
      onMouseDown={cell.getCanSelect() ? cell.getSelectionStartHandler() : undefined}
      onMouseEnter={cell.getCanSelect() ? cell.getSelectionExtendHandler() : undefined}
      className={`border-b border-r border-[var(--border)] px-3 py-2 text-sm ${presentation.textColor ? "" : "text-[var(--foreground)]"} ${tableSortableMotion} group-hover:bg-[var(--accent)] ${backgroundClass} ${groupedClass} ${presentationClasses} ${cell.getCanSelect() ? "cursor-cell focus:outline-none" : ""} ${cell.getIsFocused() ? "ring-2 ring-inset ring-[var(--ring)]" : ""}`}
    >
      {cell.getIsGrouped() ? (
        <button
          type="button"
          aria-expanded={cell.row.getIsExpanded()}
          className={`group inline-flex min-h-11 cursor-pointer items-center gap-1 rounded px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${tableButtonMotion}`}
          onClick={cell.row.getToggleExpandedHandler()}
        >
          <span
            className={`material-icons text-base ${cell.row.getIsExpanded() ? "rotate-180" : ""} ${tableIconMotion}`}
            aria-hidden="true"
          >
            expand_more
          </span>
          <table.FlexRender cell={cell} /> ({cell.row.subRows.length})
        </button>
      ) : (
        <table.FlexRender cell={cell} />
      )}
    </td>
  );
}
