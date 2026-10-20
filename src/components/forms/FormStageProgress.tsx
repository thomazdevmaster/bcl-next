type Stage = { title: string; shortTitle: string };
export type FormStageStatus = "complete" | "warning" | "error";

type Props = {
  stages: readonly Stage[];
  active: number;
  maxReachable: number;
  onSelect: (index: number) => void;
  statuses?: Readonly<Record<string, FormStageStatus>>;
  ariaLabel?: string;
};

export function FormStageProgress({
  stages,
  active,
  maxReachable,
  onSelect,
  statuses = {},
  ariaLabel = "Etapas do formulário",
}: Props) {
  return (
    <nav
      aria-label={ariaLabel}
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:gap-2"
    >
      {stages.map((stage, index) => {
        const isActive = index === active;
        const isDisabled = index > maxReachable || isActive;
        const status = statuses[stage.title];
        const statusStyle =
          status === "complete"
            ? "bg-emerald-600 text-white"
            : status === "warning"
              ? "bg-amber-400 text-amber-950"
              : status === "error"
                ? "bg-red-600 text-white"
                : null;
        const statusLabel =
          status === "complete"
            ? "Tudo certo"
            : status === "warning"
              ? "Há campos obrigatórios pendentes"
              : status === "error"
                ? "Há campos com erro"
                : undefined;

        return (
          <button
            key={stage.title}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(index)}
            aria-current={isActive ? "step" : undefined}
            aria-controls={`form-stage-${index}`}
            aria-label={`Etapa ${index + 1}: ${stage.title}${statusLabel ? `. ${statusLabel}` : ""}`}
            className={`inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-medium transition-[color,background-color,border-color,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] motion-reduce:transition-none sm:px-3 sm:text-sm ${
              isActive
                ? "border-[var(--primary)] bg-[var(--accent)] text-[var(--foreground)]"
                : isDisabled
                  ? "border-transparent text-[var(--muted)] opacity-60"
                  : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
                statusStyle ??
                (isActive
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : index < active
                    ? "bg-[var(--secondary)] text-[var(--secondary-foreground)]"
                    : "bg-[var(--card-secondary)] text-[var(--muted)]")
              }`}
            >
              {status === "complete"
                ? "✓"
                : status === "warning"
                  ? "!"
                  : status === "error"
                    ? "×"
                    : index + 1}
            </span>
            <span className="truncate">{stage.shortTitle}</span>
          </button>
        );
      })}
    </nav>
  );
}
