"use client";

import { Subscribe } from "@tanstack/react-table";
import type { Header, ReactTable } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import type { RowData } from "@tanstack/react-table";
import { TableColumnFilter } from "../filters/TableColumnFilter";
import { tableFeatures } from "../core/table-features";
import type { TableState } from "../core/table-features";
import { getColumnPinningStyles } from "./tablePinningStyles";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

export function TableHeader<TData extends RowData>({
  header,
  table,
  columnLabel,
  canReorder = true,
}: {
  header: Header<typeof tableFeatures, TData, unknown>;
  table: TableInstance<TData>;
  columnLabel: string;
  canReorder?: boolean;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useSortable({
    id: header.column.id,
    disabled: !canReorder,
  });
  const column = header.column;
  const pinningStyles = getColumnPinningStyles(column);
  const style: CSSProperties = {
    ...pinningStyles,
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
          className="relative border-b border-[var(--border)] bg-[var(--card-secondary)] p-3 text-left align-top text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
        >
          {header.isPlaceholder ? null : (
            <div className="flex min-w-32 items-start gap-2">
              {canReorder && (
                <button
                  type="button"
                  {...attributes}
                  {...listeners}
                  aria-label={`Reordenar coluna ${columnLabel}`}
                  className="min-h-11 min-w-11 cursor-grab rounded text-[var(--muted)] active:cursor-grabbing"
                  title="Arraste para reordenar"
                >
                  <span className="material-icons text-base" aria-hidden="true">
                    drag_indicator
                  </span>
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  {column.getCanPin() && (
                    <>
                      {column.getIsPinned() !== "start" && (
                        <button
                          type="button"
                          aria-label={`Fixar ${columnLabel} à esquerda`}
                          className="min-h-11 min-w-11 rounded text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                          title="Fixar à esquerda"
                          onClick={() => column.pin("start")}
                        >
                          <span className="material-icons text-base" aria-hidden="true">
                            keyboard_arrow_left
                          </span>
                        </button>
                      )}
                      {column.getIsPinned() && (
                        <button
                          type="button"
                          aria-label={`Desafixar ${columnLabel}`}
                          className="min-h-11 min-w-11 rounded text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                          title="Desafixar coluna"
                          onClick={() => column.pin(false)}
                        >
                          <span className="material-icons text-base" aria-hidden="true">
                            push_pin
                          </span>
                        </button>
                      )}
                      {column.getIsPinned() !== "end" && (
                        <button
                          type="button"
                          aria-label={`Fixar ${columnLabel} à direita`}
                          className="min-h-11 min-w-11 rounded text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                          title="Fixar à direita"
                          onClick={() => column.pin("end")}
                        >
                          <span className="material-icons text-base" aria-hidden="true">
                            keyboard_arrow_right
                          </span>
                        </button>
                      )}
                    </>
                  )}
                  {column.getCanGroup() && (
                    <button
                      type="button"
                      aria-label={column.getIsGrouped() ? "Remover agrupamento" : "Agrupar por esta coluna"}
                      className="min-h-11 min-w-11 rounded text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                      title={column.getIsGrouped() ? "Remover agrupamento" : "Agrupar por esta coluna"}
                      onClick={column.getToggleGroupingHandler()}
                    >
                      <span className="material-icons text-base" aria-hidden="true">
                        {column.getIsGrouped() ? "group_off" : "group_work"}
                      </span>
                    </button>
                  )}
                  {column.getCanSort() ? (
                    <button
                      type="button"
                      aria-label={`Ordenar por ${columnLabel}`}
                      className="min-h-11 text-left text-[var(--foreground)] hover:text-[var(--color-brand-strong)]"
                      onClick={column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                      {column.getIsSorted() && (
                        <span
                          className="material-icons ml-1 align-middle text-base"
                          aria-label={column.getIsSorted() === "asc" ? "ordem crescente" : "ordem decrescente"}
                        >
                          {column.getIsSorted() === "asc" ? "arrow_upward" : "arrow_downward"}
                        </span>
                      )}
                    </button>
                  ) : (
                    <table.FlexRender header={header} />
                  )}
                </div>
                {column.getCanFilter() && <TableColumnFilter column={column} columnLabel={columnLabel} />}
              </div>
            </div>
          )}
          {column.getCanResize() && (
            <div
              aria-label={`Redimensionar coluna ${columnLabel}`}
              onDoubleClick={() => column.resetSize()}
              onMouseDown={header.getResizeHandler()}
              onTouchStart={header.getResizeHandler()}
              className={`absolute right-0 top-0 h-full w-3 cursor-col-resize touch-none ${column.getIsResizing() ? "bg-[var(--primary)]" : "bg-transparent hover:bg-[var(--primary)]/40"}`}
            />
          )}
        </th>
      )}
    </Subscribe>
  );
}
