"use client";

import type { ChangeEventHandler, ReactNode } from "react";
import { MusicLoader } from "@/components/MusicLoader";
import { TableCheckbox } from "./TableCheckbox";
import { TableDebouncedInput } from "../inputs/TableDebouncedInput";
import { TableActionButton } from "./TableActionButton";
import { tableButtonMotion, tableIconMotion } from "../core/tableMotion";

export interface TableColumnVisibilityOption {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export interface TableToolbarLabels {
  section: string;
  search: string;
  searchPlaceholder: string;
  refresh: string;
  refreshing: string;
  reset: string;
  columns: string;
}

interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string | number) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onReset: () => void;
  selectedRowCount: number;
  totalRowCount: number;
  selectedCellCount: ReactNode;
  onClearRows: () => void;
  onSelectAllRows: () => void;
  onClearCells: () => void;
  onSelectAllCells: () => void;
  allColumnsVisible: boolean;
  onToggleAllColumns: ChangeEventHandler<HTMLInputElement>;
  columns: TableColumnVisibilityOption[];
  labels?: Partial<TableToolbarLabels>;
  searchLabel?: string;
  resetKey?: number;
  globalFilterEnabled?: boolean;
  rowSelectionEnabled?: boolean;
  cellSelectionEnabled?: boolean;
  columnVisibilityEnabled?: boolean;
  mobilePrimaryAction?: ReactNode;
}

export function TableToolbar({
  searchValue,
  onSearchChange,
  onRefresh,
  isLoading,
  onReset,
  selectedRowCount,
  totalRowCount,
  selectedCellCount,
  onClearRows,
  onSelectAllRows,
  onClearCells,
  onSelectAllCells,
  allColumnsVisible,
  onToggleAllColumns,
  columns,
  labels,
  searchLabel = "Buscar em todas as colunas",
  resetKey,
  globalFilterEnabled = true,
  rowSelectionEnabled = true,
  cellSelectionEnabled = false,
  columnVisibilityEnabled = true,
  mobilePrimaryAction,
}: TableToolbarProps) {
  return (
    <section
      aria-label={labels?.section ?? "Controles da tabela"}
      className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] px-3 sm:px-4"
    >
      <div className="flex flex-col gap-2 py-3 min-[960px]:flex-row">
        {globalFilterEnabled && (
          <TableDebouncedInput
            value={searchValue}
            onChange={onSearchChange}
            resetKey={resetKey}
            className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 text-sm text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] min-[960px]:min-w-0 min-[960px]:flex-1"
            placeholder={labels?.searchPlaceholder ?? searchLabel}
            aria-label={labels?.search ?? searchLabel}
          />
        )}
        {mobilePrimaryAction ? (
          <div className="min-[960px]:hidden">{mobilePrimaryAction}</div>
        ) : null}
        <div className="hidden min-w-0 gap-2 min-[960px]:flex">
          <TableActionButton onClick={onRefresh} disabled={isLoading}>
            {isLoading ? (
              <MusicLoader
                compact
                label={labels?.refreshing ?? "Carregando…"}
              />
            ) : (
              (labels?.refresh ?? "Atualizar dados")
            )}
          </TableActionButton>
          <TableActionButton onClick={onReset}>
            {labels?.reset ?? "Redefinir tabela"}
          </TableActionButton>
        </div>
      </div>

      <div className="hidden flex-col gap-2 border-t border-[var(--border)] py-2 min-[960px]:flex min-[960px]:flex-row min-[960px]:items-center min-[960px]:justify-between">
        {(rowSelectionEnabled || cellSelectionEnabled) && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            {rowSelectionEnabled && (
              <>
                <span>
                  {selectedRowCount.toLocaleString("pt-BR")} de{" "}
                  {totalRowCount.toLocaleString("pt-BR")} linhas selecionadas
                </span>
                <TableActionButton onClick={onClearRows}>
                  Limpar seleção
                </TableActionButton>
                <TableActionButton onClick={onSelectAllRows}>
                  Selecionar todas as linhas
                </TableActionButton>
              </>
            )}
            {cellSelectionEnabled && (
              <>
                {selectedCellCount}
                <TableActionButton onClick={onClearCells}>
                  Limpar células
                </TableActionButton>
                <TableActionButton onClick={onSelectAllCells}>
                  Selecionar todas as células
                </TableActionButton>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 sm:ml-auto sm:justify-end">
          <button
            type="button"
            disabled
            aria-label="Imprimir relatório (em breve)"
            title="Em breve"
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--info)] px-3 text-sm font-medium text-[var(--info)] disabled:cursor-not-allowed disabled:opacity-65"
          >
            <span className="material-icons text-base" aria-hidden="true">
              print
            </span>
            Imprimir
          </button>

          {columnVisibilityEnabled && (
            <details className="group relative text-sm">
              <summary
                className={`group flex min-h-11 cursor-pointer items-center gap-1 rounded-[var(--radius)] border border-[var(--info)] px-3 font-medium text-[var(--info)] hover:bg-[var(--info)] hover:text-[var(--info-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${tableButtonMotion}`}
              >
                {labels?.columns ?? "Visibilidade das colunas"}
                <span
                  className={`material-icons text-base group-open:rotate-180 motion-reduce:group-open:rotate-0 ${tableIconMotion}`}
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </summary>
              <div className="absolute right-0 top-full z-30 mt-1 max-h-64 min-w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-[var(--foreground)] shadow-[var(--shadow-soft)]">
                <label className="flex min-h-11 items-center gap-2 border-b border-[var(--border)] pb-2">
                  <TableCheckbox
                    checked={allColumnsVisible}
                    onChange={onToggleAllColumns}
                  />
                  Todas
                </label>
                {columns.map((column) => (
                  <label
                    key={column.id}
                    className="flex min-h-11 items-center gap-2"
                  >
                    <TableCheckbox
                      checked={column.checked}
                      disabled={column.disabled}
                      onChange={column.onChange}
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}
