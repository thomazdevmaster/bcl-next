"use client";

import { EntityDialog } from "@/components/shared/EntityDialog";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  danger?: boolean;
  closeOnBackdropClick?: boolean;
  confirmBeforeClose?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  busy = false,
  danger = false,
  closeOnBackdropClick,
  confirmBeforeClose,
  onClose,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <EntityDialog
      open={open}
      title={title}
      description={description}
      size="sm"
      closeOnBackdropClick={closeOnBackdropClick}
      confirmBeforeClose={confirmBeforeClose}
      onClose={onClose}
    >
      <div className="flex flex-col-reverse justify-end gap-2 border-t border-[var(--border)] p-4 sm:flex-row">
        <button
          type="button"
          className="btn-ghost min-h-11 px-4"
          disabled={busy}
          onClick={onClose}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`${danger ? "btn-danger" : "btn-primary"} min-h-11 px-4`}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </EntityDialog>
  );
}
