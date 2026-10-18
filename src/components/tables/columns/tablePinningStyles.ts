import type { Column, RowData } from "@tanstack/react-table";
import type { CSSProperties } from "react";
import { tableFeatures } from "../core/table-features";

export function getColumnPinningStyles<TData extends RowData>(
  column: Column<typeof tableFeatures, TData, unknown>,
): CSSProperties {
  const pinned = column.getIsPinned();
  return {
    boxShadow:
      pinned === "start" && column.getIsLastColumn("start")
        ? "inset -4px 0 4px -4px var(--border)"
        : pinned === "end" && column.getIsFirstColumn("end")
          ? "inset 4px 0 4px -4px var(--border)"
          : undefined,
    insetInlineStart: pinned === "start" ? `${column.getStart("start")}px` : undefined,
    insetInlineEnd: pinned === "end" ? `${column.getAfter("end")}px` : undefined,
    position: pinned ? "sticky" : "relative",
    zIndex: pinned ? 2 : 0,
    background: "var(--card)",
  };
}
