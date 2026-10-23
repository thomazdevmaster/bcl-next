"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type EntityDialogSize = "sm" | "md" | "lg" | "xl";
type EntityDialogPlacement = "center" | "bottom";

export interface EntityDialogProps {
  open: boolean;
  title: string;
  description?: string;
  size?: EntityDialogSize;
  placement?: EntityDialogPlacement;
  /**
   * Formulários com campos: false (só X, Cancelar, Salvar etc.).
   * Informativas / confirmação sem campos: true — fecha no backdrop, Esc e clique fora de controles.
   */
  closeOnBackdropClick?: boolean;
  onClose: () => void;
  onCloseComplete?: () => void;
  children: ReactNode;
}

const sizeClasses: Record<EntityDialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

const placementClasses: Record<EntityDialogPlacement, string> = {
  center:
    "fixed inset-0 m-auto max-h-[min(92dvh,48rem)] w-[calc(100%-1rem)] rounded-2xl sm:w-[calc(100%-2rem)]",
  bottom:
    "fixed inset-x-0 bottom-0 m-0 max-h-[100dvh] w-full rounded-t-2xl sm:inset-0 sm:m-auto sm:max-h-[92dvh] sm:w-[calc(100%-2rem)] sm:rounded-2xl",
};

const CLOSE_MS = 180;

function isInteractiveDismissTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, label, [role="button"], [role="link"], [contenteditable="true"]',
    ),
  );
}

export function EntityDialog({
  open,
  title,
  description,
  size = "md",
  placement = "center",
  closeOnBackdropClick = false,
  onClose,
  onCloseComplete,
  children,
}: EntityDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  const onCloseCompleteRef = useRef(onCloseComplete);
  const [renderOpen, setRenderOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
    onCloseCompleteRef.current = onCloseComplete;
  }, [onClose, onCloseComplete]);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const finishDomClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setClosing(false);
    setRenderOpen(false);
    onCloseCompleteRef.current?.();
  }, []);

  const requestClose = useCallback(
    (notifyParent: boolean) => {
      const dialog = dialogRef.current;
      if (!dialog?.open || closing) {
        if (!open) {
          clearCloseTimeout();
          finishDomClose();
        }
        return;
      }

      clearCloseTimeout();

      if (notifyParent) onCloseRef.current();

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finishDomClose();
        return;
      }

      setClosing(true);
      closeTimeoutRef.current = setTimeout(() => {
        closeTimeoutRef.current = null;
        finishDomClose();
      }, CLOSE_MS);
    },
    [clearCloseTimeout, closing, finishDomClose, open],
  );

  // Sincroniza `open` controlado com o ciclo de animação do <dialog> (mount/unmount).
  useEffect(() => {
    if (open) {
      if (closing) return;
      clearCloseTimeout();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado de portal/animacao
      setRenderOpen(true);
      return;
    }
    if (!renderOpen) return;
    requestClose(false);
  }, [clearCloseTimeout, closing, open, renderOpen, requestClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !renderOpen) return;
    if (!dialog.open) dialog.showModal();
  }, [renderOpen]);

  useEffect(
    () => () => {
      clearCloseTimeout();
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
    },
    [clearCloseTimeout],
  );

  if (!renderOpen || typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-closing={closing ? "true" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (closeOnBackdropClick) requestClose(true);
      }}
      onClick={(event) => {
        if (closeOnBackdropClick && event.target === event.currentTarget) requestClose(true);
      }}
      className={`flex translate-y-3 flex-col overflow-hidden border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--foreground)] opacity-0 shadow-lg transition-[opacity,transform,box-shadow,display] transition-discrete duration-[240ms] ease-[cubic-bezier(0.2,0,0,1)] starting:translate-y-3 starting:opacity-0 starting:shadow-lg open:translate-y-0 open:opacity-100 open:shadow-2xl open:data-[closing=true]:translate-y-2 open:data-[closing=true]:opacity-0 open:data-[closing=true]:shadow-lg open:data-[closing=true]:duration-[180ms] motion-reduce:translate-y-0 motion-reduce:transition-none backdrop:bg-black/0 backdrop:transition-colors backdrop:duration-[240ms] starting:backdrop:bg-black/0 open:backdrop:bg-black/50 open:data-[closing=true]:backdrop:bg-black/0 open:data-[closing=true]:backdrop:duration-[180ms] motion-reduce:backdrop:transition-none ${placementClasses[placement]} ${sizeClasses[size]}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
        </div>
        <button
          type="button"
          aria-label={`Fechar: ${title}`}
          onClick={() => requestClose(true)}
          className="group inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          <span className="material-icons transition-transform duration-150 group-hover:rotate-90 motion-reduce:transition-none motion-reduce:group-hover:rotate-0" aria-hidden="true">close</span>
        </button>
      </header>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        onClick={(event) => {
          if (!closeOnBackdropClick || isInteractiveDismissTarget(event.target)) return;
          requestClose(true);
        }}
      >
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
