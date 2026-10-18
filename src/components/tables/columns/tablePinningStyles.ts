import type { Column, ReactTable, RowData } from "@tanstack/react-table";
import type { CSSProperties } from "react";
import { tableFeatures } from "../core/table-features";
import type { TableState } from "../core/table-features";

export function getColumnPinningStyles<TData extends RowData>(
  column: Column<typeof tableFeatures, TData, unknown>,
  table: ReactTable<typeof tableFeatures, TData, TableState>,
  columnSizes?: Record<string, number>,
): CSSProperties {
  const pinned = column.getIsPinned();
  const startOffset = pinned === "start" && columnSizes
    ? table.getStartVisibleLeafColumns()
      .slice(0, column.getPinnedIndex())
      .reduce((total, pinnedColumn) => total + (columnSizes[pinnedColumn.id] ?? pinnedColumn.getSize()), 0)
    : column.getStart("start");
  const endOffset = pinned === "end" && columnSizes
    ? table.getEndVisibleLeafColumns()
      .slice(column.getPinnedIndex() + 1)
      .reduce((total, pinnedColumn) => total + (columnSizes[pinnedColumn.id] ?? pinnedColumn.getSize()), 0)
    : column.getAfter("end");
  return {
    boxShadow:
      pinned === "start" && column.getIsLastColumn("start")
        ? "inset -4px 0 4px -4px var(--border)"
        : pinned === "end" && column.getIsFirstColumn("end")
          ? "inset 4px 0 4px -4px var(--border)"
          : undefined,
    insetInlineStart: pinned === "start" ? `${startOffset}px` : undefined,
    insetInlineEnd: pinned === "end" ? `${endOffset}px` : undefined,
    position: pinned ? "sticky" : "relative",
    zIndex: pinned ? 2 : 0,
    background: "var(--card)",
  };
}
