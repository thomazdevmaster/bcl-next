"use client";

import { useState, type ReactNode } from "react";
import type { ReactTable, Row, RowData } from "@tanstack/react-table";
import { tableFeatures } from "./table-features";
import type { TableState } from "./table-features";

const ROW_CONTROLS_ID = "__table_row_controls";
const ROW_ACTIONS_ID = "__table_row_actions";

type TableInstance<TData extends RowData> = ReactTable<typeof tableFeatures, TData, TableState>;

function columnLabel(header: unknown, id: string) {
  return typeof header === "string" ? header : id;
}

export function TableMobileCards<TData extends RowData>({
  table,
  rows,
  noResults,
  noResultsMessage,
  renderHeaderExtra,
}: {
  table: TableInstance<TData>;
  rows: Row<typeof tableFeatures, TData>[];
  noResults: boolean;
  noResultsMessage: string;
  renderHeaderExtra?: (row: Row<typeof tableFeatures, TData>) => ReactNode;
}) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  if (noResults) {
    return (
      <p className="hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)] max-[959px]:block">
        {noResultsMessage}
      </p>
    );
  }

  return (
    <ul className="hidden flex-col gap-3 max-[959px]:flex">
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const controls = cells.find((cell) => cell.column.id === ROW_CONTROLS_ID);
        const actions = cells.find((cell) => cell.column.id === ROW_ACTIONS_ID);
        const primary = cells.find(
          (cell) => cell.column.id !== ROW_CONTROLS_ID && cell.column.id !== ROW_ACTIONS_ID,
        );
        const details = cells.filter(
          (cell) => cell !== primary && cell !== actions && cell !== controls,
        );
        const open = Boolean(openIds[row.id]);
        const primaryLabel = primary
          ? columnLabel(primary.column.columnDef.header, primary.column.id)
          : "Registro";
        const headerExtra = renderHeaderExtra?.(row);

        return (
          <li
            key={row.id}
            className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
          >
            <div className="flex flex-col gap-3 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--muted)]">{primaryLabel}</p>
                  <div className="mt-1 break-words text-base font-semibold leading-snug text-[var(--foreground)]">
                    {primary ? <table.FlexRender cell={primary} /> : row.id}
                  </div>
                </div>
                {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
              </div>
              {controls || actions ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {controls ? (
                    <div className="shrink-0">
                      <table.FlexRender cell={controls} />
                    </div>
                  ) : (
                    <span />
                  )}
                  {actions ? (
                    <div className="flex min-w-0 flex-wrap justify-end gap-1">
                      <table.FlexRender cell={actions} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {details.length > 0 ? (
              <>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-[var(--border)] px-3 text-left text-sm font-medium text-[var(--foreground)]"
                  aria-expanded={open}
                  onClick={() => setOpenIds((current) => ({ ...current, [row.id]: !current[row.id] }))}
                >
                  {open ? "Recolher" : "Ver mais"}
                  <span className="material-icons" aria-hidden>
                    {open ? "expand_less" : "expand_more"}
                  </span>
                </button>
                {open ? (
                  <dl className="border-t border-[var(--border)] px-3 py-1">
                    {details.map((cell) => (
                      <div
                        key={cell.id}
                        className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-3 last:border-b-0"
                      >
                        <dt className="shrink-0 text-xs font-medium text-[var(--muted)]">
                          {columnLabel(cell.column.columnDef.header, cell.column.id)}
                        </dt>
                        <dd className="min-w-0 break-words text-right text-sm text-[var(--foreground)]">
                          <table.FlexRender cell={cell} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
