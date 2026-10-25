"use client";

import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";

interface TableResetConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function TableResetConfirmationDialog({
  open,
  onClose,
  onConfirm,
}: TableResetConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      title="Redefinir tabela?"
      description="A configuração atual da tabela será perdida. Deseja continuar?"
      confirmLabel="Redefinir tabela"
      danger
      onClose={onClose}
      onConfirm={() => {
        try {
          onConfirm();
        } finally {
          onClose();
        }
      }}
    />
  );
}
