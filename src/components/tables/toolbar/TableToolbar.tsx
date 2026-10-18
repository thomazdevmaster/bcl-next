"use client";

import type { ChangeEventHandler, ReactNode } from "react";
import { TableCheckbox } from "./TableCheckbox";
import { TableDebouncedInput } from "../inputs/TableDebouncedInput";
import { TableActionButton } from "./TableActionButton";

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
  cellSelectionEnabled = true,
  columnVisibilityEnabled = true,
}: TableToolbarProps) {
  return (
    <section
      aria-label={labels?.section ?? "Controles da tabela"}
      className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-secondary)] p-3 sm:p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        {globalFilterEnabled && (
          <TableDebouncedInput
            value={searchValue}
            onChange={onSearchChange}
            resetKey={resetKey}
            className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-3 text-sm text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] sm:max-w-md"
            placeholder={labels?.searchPlaceholder ?? searchLabel}
            aria-label={labels?.search ?? searchLabel}
          />
        )}
        <TableActionButton onClick={onRefresh} disabled={isLoading}>
          {isLoading ? (labels?.refreshing ?? "Carregando…") : (labels?.refresh ?? "Atualizar dados")}
        </TableActionButton>
        <TableActionButton onClick={onReset}>{labels?.reset ?? "Redefinir tabela"}</TableActionButton>
      </div>
      {(rowSelectionEnabled || cellSelectionEnabled) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          {rowSelectionEnabled && (
            <span>
              {selectedRowCount.toLocaleString("pt-BR")} de {totalRowCount.toLocaleString("pt-BR")} linhas selecionadas
            </span>
          )}
          {cellSelectionEnabled && (
            <>
              {selectedCellCount}
              <TableActionButton onClick={onClearCells}>Limpar células</TableActionButton>
              <TableActionButton onClick={onSelectAllCells}>Selecionar todas as células</TableActionButton>
            </>
          )}
        </div>
      )}
      {columnVisibilityEnabled && (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-medium">{labels?.columns ?? "Visibilidade das colunas"}</summary>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="flex min-h-11 items-center gap-2">
              <TableCheckbox checked={allColumnsVisible} onChange={onToggleAllColumns} />
              Todas
            </label>
            {columns.map((column) => (
              <label key={column.id} className="flex min-h-11 items-center gap-2">
                <TableCheckbox checked={column.checked} disabled={column.disabled} onChange={column.onChange} />
                {column.label}
              </label>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
