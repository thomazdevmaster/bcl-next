"use client";

function SelectionIcon({ kind }: { kind: "all" | "delete" }) {
  const icon = {
    all: "select_all",
    delete: "delete",
  }[kind];

  return (
    <span className="material-icons shrink-0 text-lg" aria-hidden="true">
      {icon}
    </span>
  );
}

interface TableSelectionToolbarProps {
  visible: boolean;
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onDelete: () => void;
}

export function TableSelectionToolbar({
  visible,
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onDelete,
}: TableSelectionToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <section
      aria-label="Ações de seleção em lote"
      className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-soft)] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none starting:opacity-0 starting:-translate-y-1 starting:scale-[0.99] ${visible ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.99] opacity-0"}`}
    >
      <p role="status" className="text-base font-semibold tabular-nums text-[var(--foreground)]">
        {selectedCount.toLocaleString("pt-BR")}
        <span className="ml-1 text-sm font-normal text-[var(--muted)]">
          de {totalCount.toLocaleString("pt-BR")} selecionados
        </span>
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2">
        <button
          type="button"
          onClick={onToggleAll}
          aria-label={allSelected ? "Desmarcar todos os registros" : "Selecionar todos os registros"}
          className="flex min-h-11 min-w-0 touch-manipulation cursor-pointer select-none items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-[var(--info)] transition-colors hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <SelectionIcon kind="all" />
          <span className="truncate">{allSelected ? "Desmarcar todos" : "Selecionar todos"}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={!hasSelection}
          className="btn-danger flex min-h-11 touch-manipulation cursor-pointer select-none items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:active:scale-100! motion-reduce:transition-none! motion-reduce:hover:transform-none!"
        >
          <SelectionIcon kind="delete" />
          <span>Excluir</span>
        </button>
      </div>
    </section>
  );
}
