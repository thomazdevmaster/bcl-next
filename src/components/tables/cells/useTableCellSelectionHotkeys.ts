"use client";

import { useHotkeys } from "@tanstack/react-hotkeys";
import type { RefObject } from "react";
import type { ReactTable, RowData } from "@tanstack/react-table";
import { tableFeatures } from "../core/table-features";
import type { TableState } from "../core/table-features";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

export function useTableCellSelectionHotkeys<TData extends RowData>(table: TableInstance<TData>, target: RefObject<HTMLDivElement | null>) {
  const whenCellFocused = (action: () => void) => (event: KeyboardEvent) => {
    const focused = event.target;
    const container = target.current;
    if (!container || !(focused instanceof HTMLElement) || !container.contains(focused)) return;
    if (focused !== container && !(focused instanceof HTMLTableCellElement && focused.hasAttribute("tabindex"))) return;
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  useHotkeys(
    [
      { hotkey: "ArrowUp", callback: whenCellFocused(() => table.moveCellSelection("up")) },
      { hotkey: "ArrowDown", callback: whenCellFocused(() => table.moveCellSelection("down")) },
      { hotkey: "ArrowLeft", callback: whenCellFocused(() => table.moveCellSelection("left")) },
      { hotkey: "ArrowRight", callback: whenCellFocused(() => table.moveCellSelection("right")) },
      { hotkey: "Shift+ArrowUp", callback: whenCellFocused(() => table.extendCellSelection("up")) },
      { hotkey: "Shift+ArrowDown", callback: whenCellFocused(() => table.extendCellSelection("down")) },
      { hotkey: "Shift+ArrowLeft", callback: whenCellFocused(() => table.extendCellSelection("left")) },
      { hotkey: "Shift+ArrowRight", callback: whenCellFocused(() => table.extendCellSelection("right")) },
      { hotkey: "Mod+A", callback: whenCellFocused(() => table.selectAllCells()) },
      { hotkey: "Escape", callback: whenCellFocused(() => table.resetCellSelection(true)) },
    ],
    { target, ignoreInputs: true, preventDefault: false, stopPropagation: false },
  );
}
