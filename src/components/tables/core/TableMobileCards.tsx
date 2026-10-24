"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ReactTable, Row, RowData } from "@tanstack/react-table";
import { EntityDialog } from "@/components/shared/EntityDialog";
import { TableCheckbox } from "../toolbar/TableCheckbox";
import { TableMobileIconAction } from "./TableMobileIconAction";
import { tableFeatures } from "./table-features";
import type { TableState } from "./table-features";

const ROW_CONTROLS_ID = "__table_row_controls";
const ROW_ACTIONS_ID = "__table_row_actions";

export type MobileTableAction = {
  label: string;
  icon: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};

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
  getRowLabel,
  getMobilePrimary,
  getMobilePrimaryLabel,
  mobilePrimaryLabel,
  renderRowActions,
  rowPinningEnabled,
  mobileSelectionEnabled,
  selectionMode,
  onSelectionModeChange,
  selectedRowCount,
}: {
  table: TableInstance<TData>;
  rows: Row<typeof tableFeatures, TData>[];
  noResults: boolean;
  noResultsMessage: string;
  renderHeaderExtra?: (row: Row<typeof tableFeatures, TData>) => ReactNode;
  getRowLabel?: (row: TData) => string;
  getMobilePrimary?: (row: TData) => ReactNode;
  getMobilePrimaryLabel?: (row: TData) => ReactNode;
  mobilePrimaryLabel?: string;
  renderRowActions?: (row: TData) => MobileTableAction[];
  rowPinningEnabled: boolean;
  mobileSelectionEnabled: boolean;
  selectionMode: boolean;
  onSelectionModeChange: (enabled: boolean) => void;
  selectedRowCount: number;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [closingMenuId, setClosingMenuId] = useState<string | null>(null);
  const [viewingRowId, setViewingRowId] = useState<string | null>(null);
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const pointerSelectionTarget = useRef<string | null>(null);
  const suppressPointerClick = useRef(false);
  const viewingRow = rows.find((row) => row.id === viewingRowId);

  const closeMenu = useCallback(() => {
    if (!openMenuId || closingMenuId) return;
    setClosingMenuId(openMenuId);
    menuCloseTimer.current = setTimeout(() => {
      setOpenMenuId((current) => (current === openMenuId ? null : current));
      setClosingMenuId((current) => (current === openMenuId ? null : current));
      menuCloseTimer.current = null;
    }, 150);
  }, [closingMenuId, openMenuId]);

  const openMenu = (rowId: string) => {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
    menuCloseTimer.current = null;
    setClosingMenuId(null);
    setOpenMenuId(rowId);
  };

  useEffect(() => {
    if (!openMenuId || closingMenuId) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-row-action-menu][data-open="true"]')) return;
      closeMenu();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [closeMenu, openMenuId, closingMenuId]);

  useEffect(
    () => () => {
      if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
    },
    [],
  );

  const clearLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  if (noResults) {
    return (
      <p className="hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)] max-[959px]:block">
        {noResultsMessage}
      </p>
    );
  }

  return (
    <>
      <ul className="hidden flex-col gap-3 max-[959px]:flex">
        {rows.map((row) => {
          const cells = row.getVisibleCells();
          const controls = cells.find((cell) => cell.column.id === ROW_CONTROLS_ID);
          const primary = cells.find((cell) => cell.column.id !== ROW_CONTROLS_ID && cell.column.id !== ROW_ACTIONS_ID);
          const details = cells.filter(
            (cell) => cell !== primary && cell !== controls && cell.column.id !== ROW_ACTIONS_ID,
          );
          const rowLabel = getRowLabel?.(row.original) ?? row.id;
          const primaryLabel =
            mobilePrimaryLabel ??
            (primary ? columnLabel(primary.column.columnDef.header, primary.column.id) : "Registro");
          const pinned = row.getIsPinned() === "top";
          const actions = renderRowActions?.(row.original) ?? [];
          const menuVisible = openMenuId === row.id;
          const menuClosing = closingMenuId === row.id;
          const menuOpen = menuVisible && !menuClosing;
          const selectionActive = selectionMode || selectedRowCount > 0;
          const headerExtra = renderHeaderExtra?.(row);
          const toggleRowSelection = () => {
            const clearingOnlySelectedRow = row.getIsSelected() && selectedRowCount === 1;
            row.toggleSelected();
            if (clearingOnlySelectedRow) onSelectionModeChange(false);
          };

          return (
            <li
              key={row.id}
              className="overflow-visible rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
              onClick={(event) => {
                if (longPressTriggered.current) {
                  longPressTriggered.current = false;
                  return;
                }
                if (suppressPointerClick.current) {
                  suppressPointerClick.current = false;
                  return;
                }
                if (!mobileSelectionEnabled || !selectionActive) return;
                if (
                  event.target instanceof Element &&
                  event.target.closest("[data-row-action-menu], [data-mobile-row-select], button, a, input")
                )
                  return;
                if (row.getCanSelect()) toggleRowSelection();
              }}
              onPointerDown={(event) => {
                longPressTriggered.current = false;
                suppressPointerClick.current = false;
                pointerSelectionTarget.current = null;
                const interactiveTarget =
                  event.target instanceof Element &&
                  event.target.closest("[data-row-action-menu], [data-mobile-row-select], button, a, input");
                if (mobileSelectionEnabled && selectionActive && !interactiveTarget && row.getCanSelect()) {
                  pointerSelectionTarget.current = row.id;
                }
                if (!mobileSelectionEnabled || selectionActive || !row.getCanSelect() || interactiveTarget) return;
                clearLongPress();
                longPressTimer.current = setTimeout(() => {
                  longPressTriggered.current = true;
                  pointerSelectionTarget.current = null;
                  onSelectionModeChange(true);
                  row.toggleSelected(true);
                  closeMenu();
                }, 550);
              }}
              onPointerUp={() => {
                clearLongPress();
                if (selectionActive && pointerSelectionTarget.current === row.id && row.getCanSelect()) {
                  toggleRowSelection();
                  suppressPointerClick.current = true;
                }
                pointerSelectionTarget.current = null;
              }}
              onPointerCancel={() => {
                clearLongPress();
                pointerSelectionTarget.current = null;
              }}
              onPointerLeave={clearLongPress}
              onContextMenu={(event) => {
                if (mobileSelectionEnabled) event.preventDefault();
              }}
            >
              <div className="flex items-center gap-2 p-3">
                {mobileSelectionEnabled && selectionActive ? (
                  <div data-mobile-row-select>
                    <TableCheckbox
                      aria-label={`Selecionar linha ${rowLabel}`}
                      checked={row.getIsSelected()}
                      disabled={!row.getCanSelect()}
                      onChange={toggleRowSelection}
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex min-h-5 items-center">
                    <p className="text-xs font-medium text-[var(--muted)]">
                      {getMobilePrimaryLabel ? getMobilePrimaryLabel(row.original) : primaryLabel}
                    </p>
                  </div>
                  <div className="mt-1 break-words text-base font-semibold leading-snug text-[var(--foreground)]">
                    {getMobilePrimary ? (
                      getMobilePrimary(row.original)
                    ) : primary ? (
                      <table.FlexRender cell={primary} />
                    ) : (
                      row.id
                    )}
                  </div>
                </div>
                {headerExtra || controls || rowPinningEnabled || actions.length > 0 || details.length > 0 ? (
                  <div className="flex min-w-0 items-start justify-end gap-1">
                    {headerExtra}
                    {rowPinningEnabled && pinned ? (
                      <TableMobileIconAction
                        ariaLabel={`Desafixar ${rowLabel}`}
                        icon="push_pin"
                        onClick={() => row.pin(false)}
                        disabled={!row.getCanPin()}
                        className="text-[var(--color-brand-strong)]"
                      />
                    ) : null}
                    <TableMobileIconAction
                      ariaLabel={`Visualizar ${rowLabel}`}
                      icon="visibility"
                      onClick={() => {
                        setViewingRowId(row.id);
                        closeMenu();
                      }}
                    />
                    <div
                      className="relative ml-auto shrink-0"
                      data-row-action-menu
                      data-open={menuVisible ? "true" : undefined}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") closeMenu();
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`Mais opções para ${rowLabel}`}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        onClick={() => (menuOpen ? closeMenu() : openMenu(row.id))}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[var(--info)] transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none"
                      >
                        <span className="material-icons text-2xl" aria-hidden="true">
                          more_horiz
                        </span>
                      </button>
                      {menuVisible ? (
                        <div
                          role="menu"
                          aria-label={`Opções para ${rowLabel}`}
                          aria-hidden={menuClosing}
                          inert={menuClosing}
                          className={`absolute right-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-[var(--shadow-soft)] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none starting:-translate-y-1 starting:opacity-0 ${menuClosing ? "pointer-events-none -translate-y-1 opacity-0" : "translate-y-0 opacity-100"}`}
                        >
                          {mobileSelectionEnabled ? (
                            <button
                              type="button"
                              role="menuitem"
                              disabled={!row.getCanSelect()}
                              onClick={() => {
                                onSelectionModeChange(true);
                                toggleRowSelection();
                                closeMenu();
                              }}
                              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--card-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:opacity-50 motion-reduce:transition-none"
                            >
                              <span className="material-icons text-lg" aria-hidden="true">
                                {row.getIsSelected() ? "check_box" : "check_box_outline_blank"}
                              </span>
                              {row.getIsSelected() ? "Desmarcar seleção" : "Selecionar"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setViewingRowId(row.id);
                              closeMenu();
                            }}
                            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--card-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none"
                          >
                            <span className="material-icons text-lg" aria-hidden="true">
                              visibility
                            </span>
                            Visualizar
                          </button>
                          {rowPinningEnabled ? (
                            <button
                              type="button"
                              role="menuitem"
                              disabled={!row.getCanPin()}
                              onClick={() => {
                                row.pin(pinned ? false : "top");
                                closeMenu();
                              }}
                              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-[var(--foreground)] transition-colors duration-150 hover:bg-[var(--card-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:opacity-50 motion-reduce:transition-none"
                            >
                              <span className="material-icons text-lg" aria-hidden="true">
                                push_pin
                              </span>
                              {pinned ? "Desafixar linha" : "Fixar linha"}
                            </button>
                          ) : null}
                          {actions.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              role="menuitem"
                              disabled={action.disabled}
                              onClick={() => {
                                action.onSelect();
                                closeMenu();
                              }}
                              className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors duration-150 hover:bg-[var(--card-secondary)] focus-visible:outline-2 focus-visible:outline-[var(--ring)] disabled:opacity-50 motion-reduce:transition-none ${action.danger ? "text-[var(--destructive)]" : "text-[var(--foreground)]"}`}
                            >
                              <span className="material-icons text-lg" aria-hidden="true">
                                {action.icon}
                              </span>
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <EntityDialog
        open={Boolean(viewingRow)}
        title={viewingRow ? (getRowLabel?.(viewingRow.original) ?? "Detalhes do registro") : "Detalhes do registro"}
        size="md"
        placement="bottom"
        closeOnBackdropClick
        onClose={() => setViewingRowId(null)}
      >
        {viewingRow ? (
          <dl className="px-4 py-1 sm:px-6">
            {viewingRow
              .getVisibleCells()
              .filter((cell) => cell.column.id !== ROW_CONTROLS_ID && cell.column.id !== ROW_ACTIONS_ID)
              .map((cell) => (
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
      </EntityDialog>
    </>
  );
}
