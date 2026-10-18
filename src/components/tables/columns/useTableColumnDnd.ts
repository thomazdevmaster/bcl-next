"use client";

import type { RowData } from "@tanstack/react-table";

import { useCallback } from "react";
import { KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { ReactTable } from "@tanstack/react-table";
import { tableFeatures } from "../core/table-features";
import type { TableState } from "../core/table-features";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

export function useTableColumnDnd<TData extends RowData>(table: TableInstance<TData>) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, {}),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!event.over || event.active.id === event.over.id) return;
      table.setColumnOrder((order) => {
        const current = order.length ? order : table.getAllLeafColumns().map((column) => column.id);
        const from = current.indexOf(String(event.active.id));
        const to = current.indexOf(String(event.over?.id));
        return from < 0 || to < 0 ? current : arrayMove(current, from, to);
      });
    },
    [table],
  );

  return { sensors, handleDragEnd };
}
