"use client";

import { Subscribe } from "@tanstack/react-table";
import type { CellSelectionBounds, CellSelectionState, ReactTable, Row, RowData } from "@tanstack/react-table";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { TableCell } from "./TableCell";
import { tableFeatures } from "../core/table-features";
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

export function TablePinnedRow<TData extends RowData>({ row, table }: { row: Row<typeof tableFeatures, TData>; table: TableInstance<TData> }) {
  const bottomRows = table.getBottomRows();
  return (
    <Subscribe
      source={table.atoms.cellSelection}
      selector={(ranges) => rowSelectionKey(ranges, table.getCellSelectionBounds(), row.getDisplayIndex(), row.id)}
    >
      {() => (
        <tr
          className="bg-[var(--card-secondary)]"
          style={{
            position: "sticky",
            top: row.getIsPinned() === "top" ? `${row.getPinnedIndex() * 40 + 44}px` : undefined,
            bottom:
              row.getIsPinned() === "bottom" ? `${(bottomRows.length - 1 - row.getPinnedIndex()) * 40}px` : undefined,
            zIndex: 1,
          }}
        >
          {row.getVisibleCells().map((cell) => (
            <SortableContext key={cell.id} items={table.state.columnOrder} strategy={horizontalListSortingStrategy}>
              <TableCell cell={cell} table={table} />
            </SortableContext>
          ))}
        </tr>
      )}
    </Subscribe>
  );
}
