"use client";

type Props = {
  message: string;
  onOpen: () => void;
  onDismiss: () => void;
};

export function NotificationNewAlert({ message, onOpen, onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute z-[140] w-[min(calc(100vw-2rem),18rem)] rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg motion-reduce:transition-none sm:w-72 left-full top-1/2 ml-2 -translate-y-1/2 max-sm:left-auto max-sm:right-0 max-sm:top-full max-sm:mt-2 max-sm:translate-y-0"
    >
      <div className="flex items-start gap-2">
        <span
          className="material-icons mt-0.5 shrink-0 text-xl text-[var(--primary)]"
          aria-hidden
        >
          notifications_active
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Nova notificação
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug text-[var(--foreground)]">
            {message}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary min-h-9 rounded-lg px-3 text-xs font-semibold"
              onClick={() => {
                onDismiss();
                onOpen();
              }}
            >
              Ver
            </button>
            <button
              type="button"
              className="min-h-9 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--accent)]"
              onClick={onDismiss}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
