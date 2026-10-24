"use client";

import { EntityDialog } from "../../shared/EntityDialog";
import { tableButtonMotion } from "../core/tableMotion";

interface TableResetConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function TableResetConfirmationDialog({ open, onClose, onConfirm }: TableResetConfirmationDialogProps) {
  return (
    <EntityDialog open={open} title="Redefinir tabela?" size="sm" closeOnBackdropClick onClose={onClose}>
      <div className="flex flex-col gap-3 p-5">
        <p className="text-sm leading-relaxed text-[var(--muted)]">
          A configuração atual da tabela será perdida. Deseja continuar?
        </p>
      </div>
      <div className="flex flex-col-reverse justify-end gap-2 border-t border-[var(--border)] p-4 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          className={`min-h-11 rounded-[var(--radius)] border border-[var(--border)] px-4 text-sm font-medium hover:bg-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${tableButtonMotion}`}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              onConfirm();
            } finally {
              onClose();
            }
          }}
          className={`min-h-11 rounded-[var(--radius)] bg-[var(--destructive)] px-4 text-sm font-medium text-[var(--destructive-foreground)] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${tableButtonMotion}`}
        >
          Redefinir tabela
        </button>
      </div>
    </EntityDialog>
  );
}
