"use client";

import { TableActionButton } from "../toolbar/TableActionButton";
import { tableControlMotion, tableIconMotion } from "../core/tableMotion";

interface TablePaginationProps {
  currentPage: number;
  pageCount: number;
  canGoToPreviousPage: boolean;
  canGoToNextPage: boolean;
  canGoToLastPage: boolean;
  onFirstPage: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onLastPage: () => void;
  onGoToPage: (page: number) => void;
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (pageSize: number) => void;
  rowsOnPage: number;
  filteredRowCount: number;
  totalRowCount: number;
}

export function TablePagination({
  currentPage,
  pageCount,
  canGoToPreviousPage,
  canGoToNextPage,
  canGoToLastPage,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
  onGoToPage,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  rowsOnPage,
  filteredRowCount,
  totalRowCount,
}: TablePaginationProps) {
  return (
    <nav aria-label="Paginação da tabela" className="flex flex-wrap items-center gap-2">
      <TableActionButton onClick={onFirstPage} disabled={!canGoToPreviousPage} ariaLabel="Primeira página">
        <span className={`material-icons text-base ${tableIconMotion}`} aria-hidden="true">
          first_page
        </span>
      </TableActionButton>
      <TableActionButton onClick={onPreviousPage} disabled={!canGoToPreviousPage} ariaLabel="Página anterior">
        <span className={`material-icons text-base ${tableIconMotion}`} aria-hidden="true">
          chevron_left
        </span>
      </TableActionButton>
      <TableActionButton onClick={onNextPage} disabled={!canGoToNextPage} ariaLabel="Próxima página">
        <span className={`material-icons text-base ${tableIconMotion}`} aria-hidden="true">
          chevron_right
        </span>
      </TableActionButton>
      <TableActionButton onClick={onLastPage} disabled={!canGoToLastPage} ariaLabel="Última página">
        <span className={`material-icons text-base ${tableIconMotion}`} aria-hidden="true">
          last_page
        </span>
      </TableActionButton>
      <span className="px-2 text-sm">
        Página {currentPage} de {pageCount}
      </span>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        Ir para página
        <input
          type="number"
          min={1}
          max={Math.max(1, pageCount)}
          value={currentPage}
          onChange={(event) => onGoToPage(event.target.value ? Number(event.target.value) : 1)}
          className={`min-h-11 w-20 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-2 text-[var(--foreground)] ${tableControlMotion}`}
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        Linhas
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className={`min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-2 text-[var(--foreground)] ${tableControlMotion}`}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {Number.isFinite(size) ? size : "Todas"}
            </option>
          ))}
        </select>
      </label>
      <span className="text-sm text-[var(--muted)]">
        {rowsOnPage} nesta página · {filteredRowCount} filtradas · {totalRowCount} no total
      </span>
    </nav>
  );
}
