"use client";

import { Subscribe } from "@tanstack/react-table";
import type { CellSelectionBounds, CellSelectionState, ReactTable, Row, RowData } from "@tanstack/react-table";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { TableCell } from "./TableCell";
import { tableFeatures } from "../core/table-features";
import type { TableColumnPresentation } from "../core/tableColumnPresentation";
import type { TableState } from "../core/table-features";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

export function rowSelectionKey(
  ranges: CellSelectionState,
  bounds: CellSelectionBounds[],
  rowIndex: number,
  rowId: string,
) {
  const active = ranges.at(-1);
  let key = active?.anchorRowId === rowId ? `f${active.anchorColumnId}` : "";
  for (const bound of bounds) {
    const self = rowIndex >= bound.minRowIndex && rowIndex <= bound.maxRowIndex;
    const above = rowIndex - 1 >= bound.minRowIndex && rowIndex - 1 <= bound.maxRowIndex;
    const below = rowIndex + 1 >= bound.minRowIndex && rowIndex + 1 <= bound.maxRowIndex;
    if (self || above || below)
      key += `|${self ? 1 : 0}${above ? 1 : 0}${below ? 1 : 0}:${bound.minColumnIndex}-${bound.maxColumnIndex}`;
  }
  return key;
}

export function TablePinnedRow<TData extends RowData>({
  row,
  table,
  topOffset,
  bottomOffset,
  columnSizes,
  columnPresentations,
}: {
  row: Row<typeof tableFeatures, TData>;
  table: TableInstance<TData>;
  /** Measured header height plus the heights of top pinned rows before this one. */
  topOffset?: number;
  /** Sum of the heights of bottom pinned rows after this one. */
  bottomOffset?: number;
  columnSizes: Record<string, number>;
  columnPresentations: Record<string, TableColumnPresentation>;
}) {
  const pinned = row.getIsPinned();
  const offset = pinned === "top" ? topOffset : pinned === "bottom" ? bottomOffset : undefined;
  return (
    <Subscribe
      source={table.atoms.cellSelection}
      selector={(ranges) => rowSelectionKey(ranges, table.getCellSelectionBounds(), row.getDisplayIndex(), row.id)}
    >
      {() => (
        <tr
          className="group"
          style={{
            position: offset === undefined ? undefined : "sticky",
            top: pinned === "top" ? topOffset : undefined,
            bottom: pinned === "bottom" ? bottomOffset : undefined,
            zIndex: offset === undefined ? undefined : 1,
          }}
        >
          {row.getVisibleCells().map((cell) => (
            <SortableContext key={cell.id} items={table.state.columnOrder} strategy={horizontalListSortingStrategy}>
              <TableCell cell={cell} table={table} columnSizes={columnSizes} columnPresentations={columnPresentations} />
            </SortableContext>
          ))}
        </tr>
      )}
    </Subscribe>
  );
}
