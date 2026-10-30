"use client";

import { IconSelect, type IconSelectOption } from "@/components/shared/IconSelect";
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
  const pageSizeSelectOptions: IconSelectOption<string>[] = pageSizeOptions.map((size) => ({
    value: String(size),
    label: Number.isFinite(size) ? String(size) : "Todas",
  }));

  const commitPageDraft = (input: HTMLInputElement) => {
    const parsedPage = Number(input.value);
    if (!Number.isFinite(parsedPage) || input.value.trim() === "") {
      input.value = String(currentPage);
      return;
    }
    const nextPage = Math.min(Math.max(Math.trunc(parsedPage), 1), Math.max(1, pageCount));
    input.value = String(nextPage);
    onGoToPage(nextPage);
  };

  return (
    <nav aria-label="Paginação da tabela" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex w-full shrink-0 items-center justify-center gap-2 min-[960px]:w-auto min-[960px]:justify-start">
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
      </div>
      <span className="basis-full whitespace-nowrap text-center text-sm min-[960px]:basis-auto min-[960px]:text-left">
        Página {currentPage} de {pageCount}
      </span>
      <div className="flex w-full shrink-0 items-center justify-center gap-3 min-[960px]:w-auto min-[960px]:justify-start">
        <label className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-sm">
          Ir para página
          <input
            key={currentPage}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={currentPage}
            onBlur={(event) => commitPageDraft(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitPageDraft(event.currentTarget);
                event.currentTarget.blur();
              }
            }}
            className={`min-h-11 w-20 touch-manipulation rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input)] px-2 text-base text-[var(--foreground)] min-[960px]:text-sm ${tableControlMotion}`}
          />
        </label>
        <label className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-sm">
          Linhas
          <IconSelect
            label="Linhas por página"
            options={pageSizeSelectOptions}
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            className="relative min-w-[5.5rem]"
          />
        </label>
      </div>
      <span className="whitespace-nowrap text-sm text-[var(--muted)]">
        {rowsOnPage} nesta página · {filteredRowCount} filtradas · {totalRowCount} no total
      </span>
    </nav>
  );
}
