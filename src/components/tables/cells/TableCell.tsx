"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Cell, ReactTable } from "@tanstack/react-table";
import type { CSSProperties } from "react";
import type { RowData } from "@tanstack/react-table";
import { getColumnPinningStyles } from "../columns/tablePinningStyles";
import { tableFeatures } from "../core/table-features";
import type { TableState } from "../core/table-features";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

export function TableCell<TData extends RowData>({
  cell,
  table,
}: {
  cell: Cell<typeof tableFeatures, TData, unknown>;
  table: TableInstance<TData>;
}) {
  const { isDragging, setNodeRef, transform } = useSortable({ id: cell.column.id });
  const rowSpan = cell.getRowSpan();
  const colSpan = cell.getColSpan();
  if (rowSpan === 0 || colSpan === 0) return null;

  const style: CSSProperties = {
    ...getColumnPinningStyles(cell.column),
    opacity: isDragging ? 0.75 : 1,
    transform: CSS.Translate.toString(transform),
    transition: "width transform 0.2s ease",
    width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
    background: cell.getIsSelected() ? "var(--accent)" : "var(--card)",
  };
  const groupedClass = cell.getIsGrouped()
    ? "bg-[var(--card-secondary)] font-semibold"
    : cell.getIsAggregated()
      ? "bg-[var(--card-secondary)] italic"
      : "";

  return (
    <td
      ref={setNodeRef}
      style={style}
      rowSpan={rowSpan}
      colSpan={colSpan}
      tabIndex={cell.getCanSelect() ? cell.getTabIndex() : undefined}
      onMouseDown={cell.getCanSelect() ? cell.getSelectionStartHandler() : undefined}
      onMouseEnter={cell.getCanSelect() ? cell.getSelectionExtendHandler() : undefined}
      className={`border-b border-[var(--border)] px-3 py-2 align-middle text-sm text-[var(--foreground)] ${groupedClass} ${cell.getCanSelect() ? "cursor-cell focus:outline-none" : ""} ${cell.getIsFocused() ? "ring-2 ring-inset ring-[var(--ring)]" : ""}`}
    >
      {cell.getIsGrouped() ? (
        <button type="button" className="min-h-11 text-left" onClick={cell.row.getToggleExpandedHandler()}>
          {cell.row.getIsExpanded() ? "⌄" : "›"} <table.FlexRender cell={cell} /> ({cell.row.subRows.length})
        </button>
      ) : (
        <table.FlexRender cell={cell} />
      )}
    </td>
  );
}
