"use client";

import { useHotkeys } from "@tanstack/react-hotkeys";
import type { RefObject } from "react";
import type { ReactTable, RowData } from "@tanstack/react-table";
import { tableFeatures } from "../core/table-features";
import type { TableState } from "../core/table-features";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

export function useTableCellSelectionHotkeys<TData extends RowData>(table: TableInstance<TData>, target: RefObject<HTMLDivElement | null>) {
  useHotkeys(
    [
      { hotkey: "ArrowUp", callback: () => table.moveCellSelection("up") },
      { hotkey: "ArrowDown", callback: () => table.moveCellSelection("down") },
      { hotkey: "ArrowLeft", callback: () => table.moveCellSelection("left") },
      { hotkey: "ArrowRight", callback: () => table.moveCellSelection("right") },
      { hotkey: "Shift+ArrowUp", callback: () => table.extendCellSelection("up") },
      { hotkey: "Shift+ArrowDown", callback: () => table.extendCellSelection("down") },
      { hotkey: "Shift+ArrowLeft", callback: () => table.extendCellSelection("left") },
      { hotkey: "Shift+ArrowRight", callback: () => table.extendCellSelection("right") },
      { hotkey: "Mod+A", callback: () => table.selectAllCells() },
      { hotkey: "Escape", callback: () => table.resetCellSelection(true) },
    ],
    { target },
  );
}
