"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type EntityDialogSize = "sm" | "md" | "lg" | "xl";
type EntityDialogPlacement = "center" | "bottom" | "mobile-full";

export interface EntityDialogProps {
  open: boolean;
  title: string;
  description?: string;
  size?: EntityDialogSize;
  placement?: EntityDialogPlacement;
  /**
   * Padrão: true — permite fechar no backdrop e com Esc.
   */
  closeOnBackdropClick?: boolean;
  /** Padrão: true — pede confirmação antes de fechar pelo backdrop ou com Esc. */
  confirmBeforeClose?: boolean;
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
  "mobile-full":
    "fixed inset-0 m-0 h-[100dvh] max-h-[100dvh] w-full rounded-none sm:inset-0 sm:m-auto sm:h-auto sm:max-h-[min(92dvh,48rem)] sm:w-[calc(100%-2rem)] sm:rounded-2xl",
};

const CLOSE_MS = 180;

export function EntityDialog({
  open,
  title,
  description,
  size = "md",
  placement = "center",

  closeOnBackdropClick = true,
  confirmBeforeClose = true,
  onClose,
  onCloseComplete,
  children,
}: EntityDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  const onCloseCompleteRef = useRef(onCloseComplete);
  const openRef = useRef(open);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const confirmationCancelRef = useRef<HTMLButtonElement>(null);
  const [renderOpen, setRenderOpen] = useState(open);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const confirmationTitleId = useId();
  const confirmationDescriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
    onCloseCompleteRef.current = onCloseComplete;
  }, [onClose, onCloseComplete]);

  useEffect(() => {
    openRef.current = open;
    if (open) {
      // Resetar confirmações antigas quando um diálogo controlado for reaberto.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfirmingClose(false);
    }
  }, [open]);

  useEffect(() => {
    if (confirmingClose) confirmationCancelRef.current?.focus();
  }, [confirmingClose]);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const finishDomClose = useCallback(() => {
    if (openRef.current) return;
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setRenderOpen(false);
    onCloseCompleteRef.current?.();
  }, []);

  const requestClose = useCallback((notifyParent: boolean) => {
    if (!dialogRef.current?.open) return;
    if (notifyParent) onCloseRef.current();
  }, []);

  const requestCloseIntent = useCallback(() => {
    if (confirmingClose) return;
    if (!confirmBeforeClose) {
      requestClose(true);
      return;
    }
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setConfirmingClose(true);
  }, [confirmBeforeClose, confirmingClose, requestClose]);

  const cancelCloseConfirmation = useCallback(() => {
    setConfirmingClose(false);
    requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  // A prop controlada dirige o ciclo: reabrir cancela qualquer saída pendente.
  useEffect(() => {
    if (open) {
      clearCloseTimeout();
      if (!renderOpen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mounta novamente o portal ao reabrir
        setRenderOpen(true);
      }
      return;
    }
    if (!renderOpen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishDomClose();
      return;
    }
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = null;
      finishDomClose();
    }, CLOSE_MS);
    return clearCloseTimeout;
  }, [clearCloseTimeout, finishDomClose, open, renderOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !renderOpen) return;
    if (!dialog.open) dialog.showModal();
  }, [renderOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !renderOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !openRef.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (confirmingClose) cancelCloseConfirmation();
      else if (closeOnBackdropClick) requestCloseIntent();
    };
    const handleCancel = (event: Event) => {
      event.preventDefault();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [
    cancelCloseConfirmation,
    closeOnBackdropClick,
    confirmingClose,
    renderOpen,
    requestCloseIntent,
  ]);

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
      aria-labelledby={confirmingClose ? confirmationTitleId : titleId}
      aria-describedby={
        confirmingClose
          ? confirmationDescriptionId
          : description
            ? descriptionId
            : undefined
      }
      data-closing={!open ? "true" : undefined}
      onClick={(event) => {
        if (closeOnBackdropClick && event.target === event.currentTarget) {
          requestCloseIntent();
        }
      }}
      className={`flex ${placement === "bottom" ? "translate-y-full starting:translate-y-full open:data-[closing=true]:translate-y-full" : placement === "mobile-full" ? "translate-y-full starting:translate-y-full open:data-[closing=true]:translate-y-full sm:translate-y-3 sm:starting:translate-y-3 sm:open:data-[closing=true]:translate-y-2" : "translate-y-3 starting:translate-y-3 open:data-[closing=true]:translate-y-2"} flex-col overflow-visible border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--foreground)] opacity-0 shadow-lg transition-[opacity,transform,box-shadow,display] transition-discrete duration-[240ms] ease-[cubic-bezier(0.2,0,0,1)] starting:opacity-0 starting:shadow-lg open:translate-y-0 open:opacity-100 open:shadow-2xl open:data-[closing=true]:opacity-0 open:data-[closing=true]:shadow-lg open:data-[closing=true]:duration-[180ms] motion-reduce:translate-y-0 motion-reduce:transition-none backdrop:bg-black/0 backdrop:transition-colors backdrop:duration-[240ms] starting:backdrop:bg-black/0 open:backdrop:bg-black/50 open:data-[closing=true]:backdrop:bg-black/0 open:data-[closing=true]:backdrop:duration-[180ms] motion-reduce:backdrop:transition-none ${placementClasses[placement]} ${sizeClasses[size]}`}
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 pb-3 sm:px-6 sm:py-3 ${placement === "mobile-full" ? "pt-[max(0.75rem,env(safe-area-inset-top))]" : "pt-3"}`}
      >
        <div className="min-w-0">
          {confirmingClose ? (
            <>
              <h2 id={confirmationTitleId} className="text-lg font-semibold">
                Deseja realmente fechar esta janela?
              </h2>
              <p
                id={confirmationDescriptionId}
                className="mt-1 text-sm text-[var(--muted)]"
              >
                Você pode continuar usando o conteúdo ou confirmar o fechamento.
              </p>
            </>
          ) : (
            <>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description ? (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm text-[var(--muted)]"
                >
                  {description}
                </p>
              ) : null}
            </>
          )}
        </div>
        {!confirmingClose ? (
          <button
            type="button"
            aria-label={`Fechar: ${title}`}
            onClick={requestCloseIntent}
            className="group inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <span
              className="material-icons transition-transform duration-150 group-hover:rotate-90 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
              aria-hidden="true"
            >
              close
            </span>
          </button>
        ) : null}
      </header>
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${confirmingClose ? "hidden" : ""}`}
        aria-hidden={confirmingClose}
      >
        {children}
      </div>
      {confirmingClose ? (
        <div className="flex flex-col-reverse justify-end gap-2 border-t border-[var(--border)] p-4 sm:flex-row">
          <button
            ref={confirmationCancelRef}
            type="button"
            className="btn-ghost min-h-11 px-4"
            onClick={cancelCloseConfirmation}
          >
            Não, continuar
          </button>
          <button
            type="button"
            className="btn-danger min-h-11 px-4"
            onClick={() => requestClose(true)}
          >
            Sim, fechar
          </button>
        </div>
      ) : null}
    </dialog>,
    document.body,
  );
}
